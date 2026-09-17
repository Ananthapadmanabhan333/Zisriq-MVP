# System architecture

How Zisriq is put together, and why. For *how to build on it*, see
[IMPLEMENTATION.md](IMPLEMENTATION.md). For the reasoning behind specific
choices, see [DECISIONS.md](../DECISIONS.md).

---

## 1. Shape of the system

Two audiences, one database.

```
   ┌────────────────────────┐        ┌───────────────────────────┐
   │  FIRM STAFF            │        │  CLIENT                   │
   │  authenticated         │        │  no account, ever         │
   │  admin/accountant/staff│        │  holds a link             │
   └───────────┬────────────┘        └─────────────┬─────────────┘
               │                                   │
               │ session cookie                    │ opaque token in URL
               ▼                                   ▼
   ┌───────────────────────────────────────────────────────────────┐
   │                    Next.js 16 (App Router)                    │
   │                                                               │
   │  proxy.ts ── refreshes session, redirects signed-out users    │
   │              (convenience, NOT the security boundary)         │
   │                                                               │
   │  ┌─────────────────────┐        ┌──────────────────────────┐  │
   │  │ (app)/* (auth)/*    │        │ /p/[token]  /api/portal  │  │
   │  │ RLS client          │        │ service-role client      │  │
   │  │ anon key + user JWT │        │ token IS the credential  │  │
   │  └──────────┬──────────┘        └────────────┬─────────────┘  │
   └─────────────┼────────────────────────────────┼────────────────┘
                 │                                │
                 ▼                                ▼
   ┌───────────────────────────────────────────────────────────────┐
   │                          SUPABASE                             │
   │                                                               │
   │   Postgres ── RLS on every table ── THE security boundary     │
   │   GoTrue   ── firm staff auth only                            │
   │   Storage  ── private bucket, signed URLs only                │
   └───────────────────────────────────────────────────────────────┘
                 ▲
                 │  Vercel Cron, 03:30 UTC (09:00 IST)
                 │  /api/cron/reminders — service role, all firms
                 └──────────────────────────────────────────────────
```

The asymmetry is the point. Staff carry a session and everything they touch runs
through RLS. Clients carry nothing but a link, so the token is the credential and
the scoping is done explicitly in a small, heavily tested module.

---

## 2. Security model

### 2.1 RLS is the boundary, not the fallback

Every table with tenant data has `firm_id` and a policy scoping it to
`app.current_firm_ids()` — the firms the caller is a member of.

**The application never filters by firm.** `src/server/services/dashboard.ts`
contains no `where firm_id` anywhere. Not an oversight:

- Duplicating the rule in application code means it lives in two places, and two
  places drift. The day they disagree, one of them leaks.
- A forgotten `where` clause is invisible. A missing RLS policy is caught by
  `tests/integration/rls-isolation.test.ts`, which cross-checks its table
  manifest against the live database catalog — add a table without RLS and the
  suite fails.
- Role narrowing comes free. A staff user sees only their assigned requests
  because a policy says so, so the *same query* returns different rows per role.

Defence in depth sits on top, never underneath: server actions re-check the role
via `src/lib/permissions.ts`, because hiding a button is not a permission.

### 2.2 Three sanctioned RLS bypasses

The service-role key bypasses RLS entirely. Exactly three callers may use it, each
because there is genuinely no user session to carry authorisation:

| Caller | Why | Scoping instead of RLS |
|---|---|---|
| `/api/cron/reminders` | Acts for every firm at once | Every query carries the `firm_id` of the row being processed |
| `services/portal-tokens.ts` | Resolves a token for someone with no account | Returns exactly one `requestId`; callers must not widen it |
| `/api/portal/upload-confirm` | Writes on behalf of a token holder | Path anchored to the token's firm and request |

`src/server/db/admin.ts` documents this list. Anything else reaching for the
admin client is a bug in the query, not a case for an exception.

### 2.3 Tokens are credentials

Portal links and invites are treated like passwords:

- **32 random bytes** from a CSPRNG, base64url.
- **Only SHA-256 is stored.** A database dump yields no working links, and nobody
  at the firm can read a client's link out of the table.
- **Shown exactly once.** There is no "show it again" — reissuing mints a new
  token, which is what makes revocation mean anything.
- **Issuing revokes the previous one.** A firm reissuing "because the old link
  leaked" must actually kill the leaked one.
- **Expired, revoked and never-existed are indistinguishable** in the response, so
  the endpoint cannot be used to probe which links were ever real.

Plain SHA-256 rather than a slow KDF is deliberate: the token is 256 bits of
uniform randomness, so there is no dictionary to attack and stretching would only
add latency to every portal page load.

Invites additionally require the **signed-in email to match the invited address**.
Without that, the link becomes a bearer token for firm access rather than an
invitation to a specific person.

### 2.4 The server boundary

Three independent layers, all kept:

1. `import "server-only"` at the top of every module under `src/server/**` —
   fails the build if a client component imports it.
2. An ESLint rule blocking `src/components/**` from importing `@/server` at all.
3. `scripts/audit-bundle.mjs` inspects the *real build output* and fails CI if a
   secret reached a client chunk.

The first two are fast, friendly failures. The third is the one that would
actually catch a novel mistake.

---

## 3. Data model

14 tables. `firm_id` on everything tenant-scoped, so every policy has the same
shape and no policy needs a join.

```
                         ┌─────────┐
                         │  firms  │
                         └────┬────┘
        ┌─────────────────────┼─────────────────────┬──────────────┐
        │                     │                     │              │
   ┌────▼────────┐     ┌──────▼──────┐      ┌───────▼──────┐  ┌────▼─────┐
   │ memberships │     │   clients   │      │  checklist_  │  │ invites  │
   │  + profiles │     └──────┬──────┘      │  templates   │  └──────────┘
   └─────────────┘            │             └───────┬──────┘
   role: admin |              │                     │
   accountant | staff         │             ┌───────▼──────────────┐
                              │             │ checklist_template_  │
                              │             │ items                │
                              │             └──────────────────────┘
                       ┌──────▼──────┐
                       │  requests   │──── status: zq_status
                       └──────┬──────┘     due_date, assigned_to
              ┌───────────────┼───────────────┐
              │               │               │
      ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
      │ request_items│ │portal_tokens│ │  reminders  │
      └───────┬──────┘ └─────────────┘ └─────────────┘
              │         sha256 only
      ┌───────▼──────┐
      │  documents   │──── storage_path → private bucket
      └──────────────┘     sniffed_mime, review_status

   ┌──────────────────┐   ┌──────────────┐
   │ activity_events  │   │ rate_limits  │
   │ APPEND-ONLY      │   └──────────────┘
   └──────────────────┘
```

### Denormalised `firm_id`

`request_items`, `checklist_template_items` and `documents` carry `firm_id` even
though it is derivable through the parent. A trigger keeps it honest.

Without it, their policies would need a join, and a policy with a join is both
slower and harder to reason about. With it, every policy in the schema reads
`firm_id = any(app.current_firm_ids())` — one shape, reviewable at a glance.

### Status vocabulary

```
requested → awaiting_client → received → under_review → completed
     ↘            ↘              ↘            ↘
              cancelled  (terminal from any non-terminal state)
```

`under_review → awaiting_client` is how a rejection sends work back. Reopening a
completed request is not a transition; it is a new request.

**`overdue` is not a status.** It is derived at read time from `due_date` vs today
in IST. An overdue request is *simultaneously* `awaiting_client`. Rendering the two
as peer buckets double-counts every late request and makes totals stop
reconciling — which is how a dashboard starts lying. See
[DECISIONS.md D-020](../DECISIONS.md).

Transitions are enforced in three places that must agree: `src/lib/status.ts` (so
the UI offers only legal moves), the server action (readable error), and a
database trigger (the actual guarantee).

### Append-only audit trail

`activity_events` has no UPDATE or DELETE policy. Note that RLS with no policy
*filters* rather than raising — an update silently affects zero rows. Tests
assert row counts and unchanged data, not exceptions.

---

## 4. Request flows

### 4.1 Firm staff read

```
Browser ──cookie──▶ proxy.ts ──▶ Server Component
                   (refresh)        │
                                    ▼
                        requireSession() ── getUser(), not getSession():
                                    │        the latter only decodes a cookie
                                    │        the client can forge
                                    ▼
                        createClient()  anon key + user JWT
                                    │
                                    ▼
                              PostgREST ──▶ RLS ──▶ rows for this firm only
```

### 4.2 Client upload — three hops, file never touches our server

```
1. POST /api/portal/upload-url
      token → resolve → scope{firmId, requestId}
      verify itemId belongs to that request  ◀── itemId comes from the browser
      server GENERATES the object key        ◀── caller cannot choose where it lands
      → one-shot signed URL

2. PUT <signed URL>  ──────────▶  Supabase Storage
      browser → storage directly, under a pending/ prefix

3. POST /api/portal/upload-confirm
      re-derive the allowed path prefix from the token
      download first 4 KB, match magic bytes  ◀── declared MIME is not trusted
      mismatch → delete the object, reject
      match    → move out of pending/, insert documents row, log activity
```

A Vercel function body caps around **4.5 MB**, so a 25 MB upload through a route
handler cannot work at all — not merely slowly. The signed-URL path is the only
design that meets the requirement ([D-001](../DECISIONS.md)).

Until step 3 succeeds the object sits under `pending/` with nothing referencing
it, so a half-finished upload leaves no trace in the firm's view.

### 4.3 Reminders

```
Vercel Cron (03:30 UTC = 09:00 IST)
   │  Authorization: Bearer <CRON_SECRET>   ── constant-time compare
   │                                           404 on failure, not 401
   ▼
/api/cron/reminders — service role, every firm
   │
   ├─ skip terminal requests, and any where the ball is back with the firm
   ├─ planReminders(sentOn, dueDate, cadence)   ── pure, no I/O
   ├─ dedupe on (request, type, sequence_no)    ── idempotent
   ├─ send only the LATEST due nudge            ── a missed day ≠ three emails
   ├─ mint a fresh portal link (revoking the previous)
   └─ record sent | failed  ── one bad address never stops the queue
```

The schedule is pure functions over dates, so it is covered exhaustively by unit
tests with no database and no clock.

---

## 5. Cross-cutting decisions

### Time is Asia/Kolkata, always

Vercel runs in UTC; a firm in Chennai does not care. Timestamps are stored as
`timestamptz` and are unambiguous — what is ambiguous is a *calendar day*. At
23:00 UTC it is already tomorrow in Kolkata, so "due today" must be computed in
IST. Everything goes through `src/lib/dates.ts`, which resolves the zone through
`Intl` rather than adding 330 minutes by hand.

### Validation at every boundary

Zod parses at the top of every server action and route handler. Forms are read
with `formFields()`, never `formData.get()` — the latter returns `null` for an
absent field, and `z.string().optional()` rejects `null`, which produces a
validation error on a field with no UI and a form that silently does nothing.

PAN and GSTIN get real checks, not just shapes: the database has a regex CHECK,
but it cannot verify the **GSTIN checksum**, so that happens in Zod. A typo'd
GSTIN that still matches the pattern is exactly the error that surfaces months
later during filing.

### Errors that are expected are not exceptions

Server actions return a discriminated `ActionResult` for a wrong password or a
duplicate email. Those are normal outcomes the form should render. Genuine bugs
still throw and hit the error boundary.

Sign-in returns **one message** for both wrong-password and no-such-user, and
password reset **always** reports success — neither can be used to enumerate
accounts.

---

## 6. What this architecture does not do

Stated plainly, because an architecture document that lists only strengths is
marketing:

- **One firm per user.** `getSession()` picks a single membership. Multi-firm
  membership would need a firm switcher and a session concept that survives it.
- **Counting happens in JS.** The dashboard pulls statuses and counts in
  application code. Fine for hundreds of requests; at tens of thousands it needs
  aggregation in SQL or a materialised view.
- **No background job queue.** The cron is a single request with a 60-second
  budget. A firm with thousands of daily reminders would exhaust it and need a
  real queue.
- **No rate limiting on the portal beyond a table.** `rate_limits` exists; the
  enforcement is minimal.
- **Storage is single-region.** Acceptable for an Indian firm with the project in
  Mumbai; not a CDN strategy.

None of these are wrong for V1. All of them are wrong eventually.
