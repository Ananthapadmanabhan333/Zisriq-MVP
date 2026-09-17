# Implementation guide

How the code is organised, how each feature is actually built, and what to do
when you extend it. Assumes you have read [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Conventions that are not optional

These are load-bearing. Breaking one does not fail loudly, which is why they are
written down.

### Read forms with `formFields()`, never `formData.get()`

```ts
// WRONG — silently breaks the form
const parsed = schema.safeParse({ next: formData.get("next") });

// RIGHT
import { formFields } from "@/lib/forms";
const parsed = schema.safeParse(formFields(formData));
```

`formData.get()` returns `null` for an absent field. `z.string().optional()`
accepts `undefined` but **rejects `null`**. A form that omits an optional hidden
input therefore fails validation on a field with no UI — so no error renders
anywhere, and the submit button does nothing, with a `200` in the logs.

`formFields()` iterates entries, so an absent field is genuinely absent. Guarded
by `tests/unit/form-fields.test.ts`.

### Never take `firm_id` from the client

```ts
const session = await requireSession();
await supabase.from("clients").insert({
  firm_id: session.firmId,   // from the session, always
  ...parsed.data,
});
```

RLS would reject a forged `firm_id` anyway. Not reading it removes the question.

### Pure logic does not live behind `server-only`

This bit twice. `server-only` throws on import outside a React Server Component,
which makes anything importing it untestable in a plain Node process. Modules
that import the Supabase client also parse environment variables at import time,
so they cannot be unit tested without a configured environment.

Pure functions belong in `src/lib/`:

| Module | Why it is there and not in `src/server/` |
|---|---|
| `lib/forms.ts` | Pure string handling, no secrets |
| `lib/dashboard.ts` | Pure functions over a stats object |
| `lib/status.ts` | The transition table |
| `lib/dates.ts` | IST calendar maths |
| `lib/permissions.ts` | Role → capability table |

Client components that call server actions live **beside their page** in
`src/app/`, not in `src/components/` — ESLint forbids `src/components/**` from
importing `@/server` at all, and that default is correct.

### After any migration

```bash
npm run db:reset && npm run db:types
```

Types are generated from the live database. Skipping this means TypeScript
describes a schema that no longer exists.

---

## 2. Adding a feature

The same six steps every time, in this order.

### Step 1 — Migration

```bash
# Filename ordering IS the apply order.
supabase/migrations/20260918120000_add_thing.sql
```

Rules that have already cost time here:

- **A `language sql` function body is validated at creation.** A helper that
  queries a table must be created *after* that table. This is why the membership
  helpers live in the RLS migration, not the helpers migration. `plpgsql` bodies
  are not validated this way.
- **Postgres rejects a subquery inside a CHECK constraint.** Range-check that
  kind of rule in Zod instead.
- **Every `SECURITY DEFINER` function needs `set search_path = public, pg_temp`.**
  Without it, a caller can shadow `public` and have the definer's rights execute
  their own table.
- **Revoke definer functions from PUBLIC.** They are executable by everyone
  unless you revoke, which would expose them to `anon` on the portal.

### Step 2 — RLS policy

Every new tenant table needs `firm_id`, `enable row level security`, and policies
shaped like every other one:

```sql
alter table public.things enable row level security;

create policy things_select_member on public.things
  for select to authenticated
  using (firm_id = any(app.current_firm_ids()));
```

Then add it to the manifest in `tests/integration/rls-isolation.test.ts`. That
suite cross-checks its manifest against the database catalog, so a table added
without RLS **fails the test** rather than shipping.

### Step 3 — Regenerate types

```bash
npm run db:reset && npm run db:types
```

### Step 4 — Validation schema

`src/lib/validation/<domain>.ts`. Transform at the edge so the rest of the code
gets clean data — blank optional inputs become `null`, not `""`:

```ts
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));
```

### Step 5 — Server action

```ts
"use server";

export async function doThing(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "thing.create");
  } catch (error) {
    if (error instanceof PermissionError) return fail("You do not have permission.");
    throw error;
  }

  const parsed = thingSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();          // RLS client
  const { error } = await supabase.from("things").insert({
    firm_id: session.firmId,
    ...parsed.data,
  });
  if (error) return fail(error.message);

  revalidatePath("/things");
  return ok();
}
```

Expected failures **return**; bugs **throw**.

### Step 6 — UI

Server component fetches, client component handles interaction:

```tsx
const [state, formAction, pending] = useActionState(doThing, null);
const errors = state && !state.ok ? state.fieldErrors : undefined;
```

---

## 3. Feature walkthroughs

### 3.1 Auth and session

| File | Role |
|---|---|
| `src/proxy.ts` | Refreshes the session cookie, redirects signed-out users |
| `src/server/auth/session.ts` | `getSession()` / `requireSession()` |
| `src/server/actions/auth.ts` | sign-up, login, reset, sign-out |
| `src/app/auth/callback/route.ts` | Exchanges an email link's code for a session |

**Next.js 16 renamed `middleware.ts` to `proxy.ts`.** The old name does not warn —
the file is simply never loaded, leaving every route reachable while signed out.
After renaming, delete `.next`: the dev server serves a stale middleware manifest
and client JS stops loading entirely.

`getSession()` uses `supabase.auth.getUser()`, which revalidates the JWT with the
auth server. `getSession()` from the SDK only decodes the cookie, which the client
can forge. It is `cache()`d per request, so asking in the layout, the page and
three components makes one round trip.

**The proxy is not a security boundary.** Anyone can call the API directly; RLS is
what stops them reading another firm's rows.

### 3.2 Firm creation

The one write RLS cannot express: at the moment of the insert the caller belongs
to no firm, so the policies that scope every other table have nothing to match on,
and the membership that would grant access cannot be written first because it
references a firm that does not exist.

Rather than loosen the `firms` insert policy — which would let any authenticated
user mint unlimited firms — `create_firm_with_owner()` is a single
`SECURITY DEFINER` function creating firm, owner membership and audit row in one
transaction. It is the only sanctioned way a firm comes into existence.

Because a definer function is a hole in RLS by construction, its guards are
covered directly in `tests/integration/firm-onboarding.test.ts`, including that a
user mid-onboarding sees zero of everyone else's data.

### 3.3 Requests and status

Template items are **copied** into a request, not linked. Firms tweak a line per
client, and a live link would mean editing a template retroactively changed what a
client was already asked for.

Status moves go through `changeRequestStatus()`, which checks
`assertTransition()` for a readable error. The database trigger is what actually
guarantees it. `StatusActions` offers only `nextStatuses(current)`, so the UI
cannot suggest a move the database will refuse.

### 3.4 Portal and uploads

| File | Role |
|---|---|
| `services/portal-tokens.ts` | Issue, hash, resolve, revoke |
| `services/portal-view.ts` | The only data a client may see |
| `services/sniff.ts` | Magic-byte detection |
| `api/portal/upload-url/route.ts` | Mints the signed URL |
| `api/portal/upload-confirm/route.ts` | Verifies and records |

`portal-view.ts` runs with the service role, so **the scoping in that file is the
security boundary**. Two rules keep it honest:

1. Every query filters by the request id the token resolved to — never by
   anything from the URL or the form.
2. Only columns a client should see are selected. No internal notes, no assignee,
   no other clients.

`sniff.ts` is deliberately small and dependency-free: it recognises exactly the
formats the product accepts and rejects everything else. A general-purpose
detector would recognise far more than we want to store. A real PDF named `.png`
is still a mismatch, because the extension drives how the firm's browser will
later treat it.

### 3.5 Reminders

`services/reminders.ts` is pure — no I/O, no clock — so the cadence is covered
exhaustively by 16 unit tests.

Behaviour worth knowing before changing it:

- Follow-ups count from **sent**, not created. A request drafted in March and sent
  in July chases from July.
- A follow-up landing after the due date is dropped; the overdue series takes over
  and says something more useful.
- Overdue notices are **capped**. A firm that chases forever trains its clients to
  ignore the emails.
- Chasing stops the moment the ball is back with the firm (`received`,
  `under_review`). Asking a client for documents they already sent is the fastest
  way to lose their trust in the tool.

The cron dedupes on `(request, type, sequence_no)` and sends only the **latest**
due nudge. Three emails because the cron was down is a bug, not diligence.

---

## 4. Testing

| Suite | Command | Needs |
|---|---|---|
| Unit | `npm test` | Nothing |
| Integration | `npm run test:integration` | Local Supabase |
| Schema only | `npm run db:verify` | Docker only |
| e2e | `npm run test:e2e` | Dev server |

Mandatory coverage: **permissions, tokens, status transitions, reminder
scheduling**. Elsewhere, test what is load-bearing.

### Two traps this suite has already hit

**RLS filters, it does not raise.** With RLS enabled and no policy for a command,
the missing `USING` clause evaluates to false — the statement *succeeds* matching
zero rows. Only `WITH CHECK` violations raise. Assert row counts and confirm the
data is unchanged from a privileged connection; never assert "it threw".

**Do not mutate shared fixtures.** A test that cancels a seeded request passes
once and fails on every rerun. Create and clean up your own rows. Prove it by
running the suite twice without `db:reset`.

### `server-only` under Vitest

Both configs alias it to `tests/helpers/server-only-stub.ts`. These tests are
server-side code in a plain Node process; without the alias every service import
throws before the first assertion. The real package still guards the real build.

---

## 5. Design system

Dark warm-neutral shell, **one** gold accent, `--radius: 1rem`. Every neutral sits
on the brown side of grey (hue ~60 in OKLCH) — that is what stops it reading as
generic dark mode.

Status colour always comes from a token, never picked per component:

| Token | Meaning |
|---|---|
| `--received` | Done, in hand |
| `--awaiting` | Waiting on the client |
| `--overdue` | Past due |
| `--review` | With the firm |

**One gold primary action per screen.** The moment a second competes, neither
reads as primary.

The `.light` class re-declares tokens for a light island inside the dark shell —
used by the landing page's sign-in card.

### Numbers on a dashboard must reconcile

`statusSegments()` and `segmentsReconcile()` in `lib/dashboard.ts` exist because
this broke twice: first `overdue` shown beside `awaiting` (double-counting), then
`Draft` missing entirely and `cancelled` counted in the total with no segment.

Tests assert the non-subset segments sum to the total and that every non-terminal
status has a segment. Adding a status without one now fails a test instead of
silently vanishing from the chart.

---

## 6. Where to start, by task

| You want to… | Start at |
|---|---|
| Add a field to a client | `lib/validation/client.ts` → migration → `db:types` |
| Change who can do what | `lib/permissions.ts` — `can()` is exhaustive over the capability union |
| Change the chase schedule | `services/reminders.ts` + its unit tests |
| Change what a client sees | `services/portal-view.ts` — read the header first |
| Add a status | `lib/status.ts`, the enum migration, the trigger, **and** `lib/dashboard.ts` |
| Add an accepted file type | `lib/validation/upload.ts` **and** `services/sniff.ts` **and** the storage migration |

---

## 7. The next three things to build

In order of how much they matter to a firm actually using this.

1. **Signed download URLs.** The firm can see that `Bank Statement.pdf` arrived
   and cannot open it. Mint a short-lived signed URL server-side after checking
   the caller can see the parent request.
2. **Document review.** `zq_doc_review` and its policies exist; nothing writes
   them. Approve / reject / request resupply, with rejection moving the item back
   to `awaiting_client` so the existing reminder machinery picks it up
   automatically.
3. **Real e2e coverage.** One Playwright journey — sign up, create a client, send
   a request, upload through the portal, see it land — would catch the class of
   integration bug that unit and RLS tests structurally cannot.
