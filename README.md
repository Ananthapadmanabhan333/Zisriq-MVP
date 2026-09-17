# Zisriq

**Document collection and follow-up for Indian CA and accounting firms.**

A firm creates a client, builds a document checklist, and sends a secure link.
The client uploads from their phone — no account, no password, no app. Zisriq
tracks what is missing, chases it automatically, and shows the firm one dashboard
of what is blocked and on whom.

---

## The problem it solves

Every filing season, a firm needs bank statements, Form 16s, GST returns and
invoices from dozens or hundreds of clients. Today that happens over WhatsApp and
email: the firm asks, the client forgets, someone sends a blurry photo of page 2
only, and nobody has a single view of what is still outstanding.

The work is not hard. The *chasing* is unstructured and invisible.

Zisriq answers one question well: **what am I waiting on, from whom, and for how
long?**

## Scope

**V1 is document collection and follow-up. Nothing else.**

Deliberately **not** built, and not planned: accounting/ERP, Tally integration,
GST filing, GSTR-2B/AIS/26AS reconciliation, payroll, invoicing, payments, a
native mobile app, WhatsApp Business API, in-app chat, e-signature, multi-language.

A tool that does one job properly is more useful to a firm than one that does ten
jobs badly.

---

## Status

Working end to end against a local stack. **Not deployed anywhere.**

| Area | State |
|---|---|
| Schema, RLS, multi-tenancy | Done, verified by tests |
| Auth, onboarding, firm shell | Done |
| Clients, templates, requests | Done |
| Client portal and uploads | Done |
| Reminders and cron | Done |
| Deployment | Documented, never executed |

**Tests: 65 unit, 89 integration.** Typecheck, lint, format and production build
all clean.

### Known gaps — read before demoing

- **The firm cannot open a document a client sent.** Uploads are received and
  listed, but signed download URLs are not built yet. This is the most visible
  gap.
- **No document review UI.** `zq_doc_review` (pending / approved / rejected /
  resupply_requested) exists in the schema with policies, but nothing writes it.
- **e2e tests are one smoke test**, not a user journey.
- Dashboard stat cards show no period-over-period deltas.
- Member role changes and removal have working server actions but no UI.
- Landing-page social proof is placeholder and switched off. See
  [`src/lib/marketing.ts`](src/lib/marketing.ts).

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19, TypeScript strict |
| UI | Tailwind CSS v4 + shadcn/ui, Lucide icons |
| Data / Auth / Storage | Supabase — Postgres, Auth, Storage |
| Validation | Zod v4 at every input boundary |
| Email | Resend |
| Scheduling | Vercel Cron → protected route handler |
| Tests | Vitest (unit + integration), Playwright (e2e) |
| Hosting | Vercel + Supabase Cloud |

**Row Level Security is the security boundary.** Not middleware, not application
code. See [Architecture](docs/ARCHITECTURE.md#security-model).

---

## Prerequisites

- **Node 20+**
- **Docker Desktop**, running — the local Supabase stack needs it
- **~8 GB free disk.** Non-negotiable: filling the disk once corrupted Docker's
  image layers here and cost hours. See [Troubleshooting](#troubleshooting).

## Setup

```bash
npm install
npm run db:start      # starts local Supabase (first run pulls ~5 GB of images)
```

Copy the template and fill it from the stack you just started:

```bash
cp .env.example .env.local
npx supabase status -o env      # prints API_URL, ANON_KEY, SERVICE_ROLE_KEY, JWT_SECRET
```

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` — **bypasses RLS** |
| `SUPABASE_JWT_SECRET` | `JWT_SECRET` |
| `APP_URL` | `http://localhost:3000` |

Then:

```bash
npm run db:reset      # apply migrations + seed
npm run db:types      # regenerate src/types/database.ts
npm run dev
```

### Seeded logins

All use `Password123!`. Two firms exist so you can see tenant isolation for real.

| Email | Firm | Role | What they see |
|---|---|---|---|
| `priya@deshmukhca.example` | Deshmukh & Associates | Admin | Everything in the firm |
| `rahul@deshmukhca.example` | Deshmukh & Associates | Accountant | Everything except firm settings |
| `sneha@deshmukhca.example` | Deshmukh & Associates | Staff | **Only her assigned requests** |
| `venkat@iyervenkat.example` | Iyer Venkatraman & Co. | Admin | A completely separate firm |

Sign in as `sneha` and then `venkat` — the narrowing is done by RLS policies, with
no `where firm_id` anywhere in the application code.

---

## Everyday commands

```bash
npm run dev               # dev server
npm run build             # production build
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm run format            # prettier --write .

npm test                  # unit tests — fast, no database
npm run test:integration  # RLS + portal tokens — REQUIRES local Supabase
npm run test:all          # both
npm run test:e2e          # playwright

npm run db:start          # supabase start
npm run db:stop
npm run db:reset          # re-apply migrations + seed
npm run db:types          # regenerate types — run after EVERY migration
npm run db:verify         # apply everything to a throwaway Postgres, run 36 RLS
                          # checks. Needs only Docker, not the full stack.
npm run db:push:prod      # apply migrations to a linked cloud project

npm run audit:bundle      # fail if a secret reached the client bundle
```

### `npm run db:verify`

Spins up a throwaway Postgres, applies all migrations and the seed, then runs 36
cross-tenant checks by simulating how PostgREST executes a request — assuming the
`authenticated` or `anon` role and setting the JWT claim variables.

Faster than the full stack and useful when Docker is being difficult. It proves
DDL validity and RLS *policy* behaviour; it does not exercise GoTrue or PostgREST,
so real sign-in still needs `npm run test:integration`.

---

## Project layout

```
src/app/(auth)        sign-up, login, password reset
src/app/(app)         authed firm shell: dashboard, clients, requests,
                      templates, members, activity, settings
src/app/p/[token]     PUBLIC client portal — no login, mobile-first
src/app/invite/[token] invite acceptance
src/app/api           portal upload URL + confirm, cron/reminders
src/server            server-only: actions, services, admin db client
src/lib               env, supabase clients, status machine, permissions,
                      validation, IST dates
supabase/migrations   schema + RLS, applied in filename order
tests/unit            pure logic
tests/integration     RLS cross-tenant matrix, portal tokens, onboarding
tests/sql             standalone schema verification
```

---

## Documentation

| Document | What it covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data model, security model, request flows |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | How each feature is built, and how to extend it |
| [DECISIONS.md](DECISIONS.md) | Numbered decision log — what was chosen and why |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Supabase Cloud + Vercel, step by step |
| [CLAUDE.md](CLAUDE.md) | Working notes and accumulated gotchas |

---

## Security model, in one paragraph

Every table carrying tenant data has `firm_id` and an RLS policy scoping it to
`app.current_firm_ids()`. The application never filters by firm — if it did, the
rule would live in two places and they would drift. Three surfaces bypass RLS by
necessity, because no user session exists to carry authorisation: the reminder
cron, portal token resolution, and upload confirmation. Each is a single module,
documented as such, and covered directly by tests. Portal links and invites are
credentials: 32 random bytes, stored only as SHA-256, shown exactly once, revoked
when reissued.

---

## Troubleshooting

### A Supabase container exits with code 139

Exit 139 is a segfault. If it happens with **no log output at all**, the binary
inside the image is truncated, not broken — this happens when the disk fills while
images are pulling. Docker still reports the image as present, so `docker pull`
becomes a no-op and the fault survives every retry.

```bash
docker rmi -f public.ecr.aws/supabase/gotrue:v2.196.0
docker pull public.ecr.aws/supabase/gotrue:v2.196.0
```

Check the entrypoint's size before blaming WSL2 — a suspiciously round number is
the tell:

```bash
docker run --rm --entrypoint sh public.ecr.aws/supabase/gotrue:v2.196.0 -c "ls -l /usr/local/bin/auth"
```

### Docker Desktop will not start — stale sockets

`rename <x>.sock <x>.sock.stale: The file cannot be accessed by the system`.
Renaming one directory buys a single start attempt, because orphaned
`com.docker.backend` processes keep re-breaking the sockets. What works: kill
every docker/vpnkit process except `com.docker.service`, run `wsl --shutdown`,
rename **both** `%LOCALAPPDATA%\Docker\run` and
`%LOCALAPPDATA%\docker-secrets-engine`, then relaunch.

Do **not** use "Reset to factory defaults" — it wipes every image.

### Forms silently do nothing, with a 200 in the logs

Almost always one of two things, both documented in [CLAUDE.md](CLAUDE.md):
`middleware.ts` not renamed to `proxy.ts` for Next 16, or a form read with
`formData.get()` instead of `formFields()`.

---

## Licence

Not yet licensed. All rights reserved.
