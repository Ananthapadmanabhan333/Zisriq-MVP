# DECISIONS.md

Architectural decisions, and anything noticed but deliberately not built. Append-only —
supersede an entry rather than rewriting it.

---

## D-001 — Uploads go direct to Supabase Storage, not through a route handler
**Phase 0 · Accepted**

**Context.** The spec requires server-side validation of uploads up to 25 MB, with content-type
sniffing rather than trusting the extension.

**Problem.** Vercel serverless functions cap request bodies at roughly 4.5 MB. A 25 MB file
cannot be POSTed to a Next route handler on Vercel at all. This is a platform limit.

**Decision.** Three-step upload:
1. Client calls `/api/portal/upload-url`; the server authorises the token, rate-limits, and
   returns a **signed upload URL** scoped to `firm_id/client_id/request_id/pending/<uuid>`.
2. Client uploads directly to Supabase Storage.
3. Client calls `/api/portal/confirm-upload`; the server range-reads the first 4 KB, sniffs
   magic bytes, checks the size reported by Storage, and then either moves the object to its
   final path and inserts the `documents` row, or deletes the object and returns an error.

**Consequence.** Nothing counts as "received" until server-side validation passes. Orphaned
objects under `pending/` are swept by the daily cron. Validation guarantees are unchanged;
only the transport differs.

---

## D-002 — Storage filenames are `<uuid>.<ext>`, not `<uuid>-<original>`
**Phase 0 · Accepted**

The spec's path shape embeds the client's original filename. Client filenames carry spaces,
non-ASCII characters, `../` sequences, and lengths that exceed key limits. The object key is
`<uuid>.<ext>` where `ext` comes from the **sniffed** content type; `original_filename` is
stored in the `documents` row and is what the UI displays and what signed downloads set as
the download name. Same information, no injection surface.

---

## D-003 — Cross-tenant isolation is a Vitest integration suite, not Playwright
**Phase 0 · Accepted**

The spec permits "a Playwright or integration test". Playwright drives a browser, so it can
only observe rows the UI happens to render — it under-tests silently and rots as tables are
added. Instead: a Vitest suite authenticates two real users in two firms and, for **every**
table, asserts that Firm A cannot select, insert, update, or delete Firm B's rows. The table
list is a manifest that is cross-checked against `information_schema`, so adding a table
without RLS fails CI rather than passing unnoticed. One Playwright test still covers the
cross-tenant path through the UI.

---

## D-004 — Client portal access is enforced by RLS, via a minted scoped JWT
**Phase 0 · Accepted**

The portal has no logged-in user, so the obvious implementation is service-role access with
application-code scoping — which would make the portal the one place where RLS is *not* the
security boundary, contradicting the spec's own acceptance criteria.

Instead: after verifying the presented token against `portal_tokens.token_hash` (and checking
expiry and revocation), the server mints a short-lived JWT carrying a `portal_request_id`
claim, signed with `SUPABASE_JWT_SECRET`. RLS policies on the portal-reachable tables grant
access keyed on that claim. A bug in portal code therefore cannot read another request's data,
because the database will not return it.

**Risk noted.** Supabase is migrating toward asymmetric JWT signing keys. If the production
project cannot issue a shared-secret JWT, the fallback is a single audited service-role data
access module (`src/server/db/portal-scope.ts`) that takes `request_id` as its first argument
and is the only module permitted to touch portal data. Revisit at Phase 4.

---

## D-005 — Rate limiting is Postgres-backed, not Redis
**Phase 0 · Accepted**

Serverless instances share no memory, so in-process counters do not limit anything. The env
list in the spec has no Redis, and adding Upstash means another vendor, another key, another
failure mode for a pilot. A `rate_limits` table with a `security definer` token-bucket RPC
costs one round trip and is adequate for pilot volumes. If portal traffic ever makes this the
bottleneck, swap the implementation behind `src/lib/rate-limit.ts` — the interface is designed
for that.

---

## D-006 — PAN and GSTIN are validated by format only
**Phase 0 · Accepted**

PAN's fourth character encodes holder type (`P` individual, `C` company, `F` firm, …), which
invites cross-validating it against `clients.type`. That would reject valid data: a
proprietorship files under the proprietor's individual `P` PAN. Validation is therefore
format regex plus the GSTIN mod-36 checksum, with **no** cross-check against client type.

---

## D-007 — `overdue` is derived, never stored
**Phase 0 · Accepted**

The spec lists `overdue` alongside the status values but describes it as a derived flag. It is
deliberately **not** a member of `zq_status`: storing it would destroy the underlying state and
leave no defined way back. It is computed at read time from `due_date` against the current date
in Asia/Kolkata, for requests not in `completed` or `cancelled`.

---

## D-008 — One cron entry, not two
**Phase 0 · Accepted**

The reminder engine and the internal staff digest both run daily. Vercel's Hobby plan permits
a limited number of cron jobs at daily granularity. Both run from a single handler in sequence,
which also keeps idempotency logic in one place.

---

## D-009 — `memberships` is the sole authority for authorisation
**Phase 0 · Accepted**

The spec describes `profiles` as "linked to a firm" while also specifying a `memberships` join
table. Two sources of truth will drift. `profiles` holds identity only (name, email, phone);
`memberships` decides every access question. The schema therefore supports a user belonging to
multiple firms, though V1's UI assumes one and ships no firm switcher.

---

## D-010 — Denormalised `firm_id`, kept honest by triggers
**Phase 1 · Accepted**

Child tables (`request_items`, `documents`, `portal_tokens`, `reminders`,
`checklist_template_items`) carry their own `firm_id` even though it is derivable through a
join. This lets every policy in the schema use the same shape and keeps RLS cheap.

A denormalised tenancy column is a hole if it can disagree with its parent, so it is never
trusted from the caller: a `BEFORE INSERT OR UPDATE` trigger on each table overwrites it with
the parent's value. Supplying someone else's `firm_id` does not smuggle a row anywhere — it is
simply replaced, and the `WITH CHECK` clause then evaluates against the true owner.

`requests` gets an additional guard, `assert_request_client_same_firm`, because its two
tenancy anchors (`firm_id` and `client_id`) could otherwise disagree.

---

## D-011 — `ENABLE` row level security, not `FORCE`
**Phase 1 · Accepted**

`FORCE ROW LEVEL SECURITY` makes policies apply to the table owner as well. That sounds
strictly safer, but the `app.*` authorisation helpers are `SECURITY DEFINER` functions owned
by `postgres` whose entire purpose is to read `memberships` without re-entering the policy
that is being evaluated. Under `FORCE`, that recursion returns.

PostgREST connects as `authenticator` and switches to `anon`, `authenticated` or
`service_role` — never to the table owner — so `FORCE` closes no reachable path. Plain
`ENABLE` plus explicit `to authenticated` / `to anon` on every policy is the safer trade.

---

## D-012 — Views are `security_invoker`
**Phase 1 · Accepted**

A Postgres view runs with its *owner's* privileges by default, which silently bypasses the RLS
of every table beneath it. That is one of the most common ways a multi-tenant app leaks.
`v_requests_enriched` is declared `with (security_invoker = true)` so the caller's policies
still apply. Any view added later must do the same.

---

## D-013 — At most one live portal token per request
**Phase 1 · Accepted**

A partial unique index (`where revoked_at is null`) permits only one un-revoked token per
request. Regenerating a link must therefore revoke the previous one in the same transaction.
Without this, a firm that "regenerated" a link after sending it to the wrong address would
still have the old link working — a withdrawal the user believes happened but did not.

---

## D-014 — Reminder idempotency is a database constraint, not application logic
**Phase 1 · Accepted**

The spec requires the daily cron to be idempotent. Rather than having the handler check
whether it already sent something — which races with itself on a retry — the ledger carries
`unique (request_id, type, sequence_no, scheduled_for)`. The handler inserts the row it is
about to send; a duplicate is rejected by Postgres and the send is skipped. Re-running the
cron any number of times in a day cannot double-send.

---

## D-015 — `security_audit_tables()` exists so the isolation suite cannot rot
**Phase 1 · Accepted**

The cross-tenant test asserts that its table manifest equals the set of tables actually
carrying `firm_id`, and that no table in `public` has RLS disabled. That requires catalog
metadata, which PostgREST does not expose. A service-role-only `SECURITY DEFINER` function
provides exactly those two facts and nothing else. The effect: adding a table without adding
a probe, or without enabling RLS, fails CI instead of passing unnoticed.

---

## D-016 — SUPERSEDED: the "WSL2 segfault" was corrupted Docker image layers
**Phase 1 · Superseded by the finding below**

This entry originally concluded that `supabase start` could not run on this machine
because Supabase's Realtime container segfaults under WSL2, and recommended developing
against a cloud project. **That diagnosis was wrong**, and the recommendation is
withdrawn. The local stack works.

**What was actually happening.** The C: drive had filled to 1 GB free, which pushed the
Docker VM's filesystem read-only mid-pull. Docker recorded the affected images as
present, but their layers were **truncated on disk**. The giveaway: GoTrue's `auth`
binary was exactly 8,388,608 bytes — precisely 8 MiB, a block boundary. The real binary
is 52,556,098 bytes. A truncated ELF executable segfaults the instant it is exec'd,
which is why both GoTrue and Realtime died with exit 139 and produced no log output at
all.

Because Docker considered the images present, every subsequent `docker pull` was a
no-op ("Status: Image is up to date"), so the corruption persisted across every retry.
`docker rmi -f` followed by `docker pull` is what actually repairs it.

**What this ruled in and out.** A shell ran fine inside the same GoTrue image, and an
unrelated Go binary (`caddy`) ran fine on the same daemon — so neither WSL2, nor Docker,
nor Go, nor the CPU was at fault. Only the Supabase images were damaged, and only
because they happened to be the ones being pulled while the disk was full.

**The lesson worth keeping.** An exit-139 with no output from a container is a corrupt
binary until proven otherwise. Check the on-disk size of the entrypoint before blaming
the platform. A suspiciously round file size is the tell.

---

## D-016a — A cloud project remains a supported fallback
**Phase 1 · Accepted**

`npm run db:setup:cloud` and the README's cloud path are kept, because they are useful
independently of the bug above: they are how a machine without Docker, or a second
developer, gets a working environment, and they exercise the same `supabase db push`
path that production uses. The local stack is the default again.

`[realtime] enabled = false` is also kept, on its own merits: V1 uses no subscriptions,
so the service is dead weight.

---

## D-017 — Absent RLS policies FILTER, they do not raise
**Phase 1 · Accepted**

`activity_events` is append-only by having no UPDATE or DELETE policy. The first
version of the verification suite asserted that `update activity_events ...` would
throw, and it did not — the statement *succeeded*, matching zero rows.

That is correct Postgres behaviour, and it matters: with RLS enabled and no policy
for a command, the missing `USING` clause evaluates to false, so nothing qualifies
and the statement reports success having changed nothing. Only `WITH CHECK`
violations (INSERT, or an UPDATE that would move a row out of scope) raise
`42501`.

**Consequence for tests.** Never assert "it threw" for a SELECT/UPDATE/DELETE that
RLS should block — assert the affected row count is zero, and confirm the data is
unchanged from a privileged connection. `tests/sql/verify-rls.sql` and
`tests/integration/rls-isolation.test.ts` both do this. The schema was correct; the
assertion was wrong.

---

## D-018 — A SQL verification harness, independent of the Supabase stack
**Phase 1 · Accepted**

Because `supabase start` cannot run on the development machine (D-016), schema
correctness would otherwise be unverifiable locally. `npm run db:verify` applies every
migration and the seed to a throwaway `supabase/postgres` container and runs 36
cross-tenant checks against it, simulating PostgREST by assuming the `authenticated`
or `anon` role and setting the JWT claim GUCs.

`tests/sql/bootstrap-bare-postgres.sql` adds the few things the bare image lacks
(`auth.jwt()`, the storage tables, and the modern GoTrue columns on `auth.users`).
The seed is written for real Supabase and was **not** adjusted to the image's older
`auth.users` shape — the shim was brought forward instead.

**Limits, stated plainly.** This proves DDL validity and RLS *policy behaviour*. It does
not exercise GoTrue or PostgREST, so real JWT issuance, password sign-in and the REST
layer remain covered only by `npm run test:integration` against a real Supabase.

---

## Noticed, deliberately not built

- **Client-facing notification preferences** (opt-out of reminders). Out of V1 scope.
- **Bulk request creation** across many clients for one period — an obvious CA workflow
  ("GSTR-1 for all 40 clients"), but not in the spec. Worth raising before pilot.
- **Document versioning.** A re-upload against the same item currently creates a new
  `documents` row; there is no explicit version chain. Adequate for V1.
- **Audit log export.** `activity_events` is append-only and queryable but has no UI export.
