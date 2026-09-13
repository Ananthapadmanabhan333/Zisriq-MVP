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

## D-016 — Local development may run against a cloud project
**Phase 1 · Accepted**

`supabase start` cannot run on this development machine. Supabase's Realtime container
is an Elixir/BEAM service whose migration binary segfaults under WSL2:

```
+ sudo -E -u nobody /app/bin/migrate
/app/run.sh: line 98: 8 Segmentation fault   sudo -E -u nobody /app/bin/migrate
{"code":"LegacyDbSetupError","message":"error running container: exit 139"}
```

Ruled out by direct test, each independently: the project's own migrations (it fails
identically with all of them moved aside), a corrupt postgres image (re-pulled, same
digest), Docker itself (`hello-world` runs), `networkingMode=mirrored` in `.wslconfig`,
and an outdated WSL kernel (2.7.12 / 6.18.33, both current). Setting
`[realtime] enabled = false` does **not** avoid it, because the CLI applies Realtime's
schema migrations during db setup regardless of that flag.

**Decision.** Local Docker remains the documented default, and CI uses it (GitHub
runners are unaffected). On a machine where it fails, development targets a dedicated
Supabase Cloud project via `npm run db:setup:cloud`. The schema, RLS and seed are
identical either way — it is the same Postgres — so nothing about the product changes.

`[realtime] enabled = false` is kept regardless, because V1 uses no subscriptions and
the service is otherwise dead weight.

**Consequence.** The cloud path uses `supabase db reset --linked`, which drops and
rebuilds the remote public schema. The helper script requires the operator to retype
the project ref before proceeding, and the README states plainly that it must only ever
point at a throwaway development project.

---

## Noticed, deliberately not built

- **Client-facing notification preferences** (opt-out of reminders). Out of V1 scope.
- **Bulk request creation** across many clients for one period — an obvious CA workflow
  ("GSTR-1 for all 40 clients"), but not in the spec. Worth raising before pilot.
- **Document versioning.** A re-upload against the same item currently creates a new
  `documents` row; there is no explicit version chain. Adequate for V1.
- **Audit log export.** `activity_events` is append-only and queryable but has no UI export.
