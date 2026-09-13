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

## Noticed, deliberately not built

- **Client-facing notification preferences** (opt-out of reminders). Out of V1 scope.
- **Bulk request creation** across many clients for one period — an obvious CA workflow
  ("GSTR-1 for all 40 clients"), but not in the spec. Worth raising before pilot.
- **Document versioning.** A re-upload against the same item currently creates a new
  `documents` row; there is no explicit version chain. Adequate for V1.
- **Audit log export.** `activity_events` is append-only and queryable but has no UI export.
