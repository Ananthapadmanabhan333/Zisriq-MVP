# CLAUDE.md — Zisriq

Working notes for any session picking this repo up. Keep current: update at the end of every phase.

## What this is

Zisriq is the workflow layer between an Indian CA/accounting firm and its clients.
A firm creates a client, generates a document checklist, sends a secure upload link,
and Zisriq tracks what is missing, chases it, and shows the firm one dashboard of
what is blocked and on whom.

**V1 is document collection and follow-up only.** Out of scope, do not build: accounting
ERP, Tally integration, GST filing, GSTR-2B/AIS/26AS reconciliation, payroll, invoicing,
payments, native mobile, WhatsApp API, autonomous agents, in-app chat, e-signature,
multi-language. If asked for one of these, say it is out of scope and ask for confirmation.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19, TypeScript strict |
| UI | Tailwind CSS v4 + shadcn/ui (`radix` base, `nova` preset), Lucide icons |
| Data / Auth / Storage | Supabase (Postgres, Auth, Storage) — **RLS is the security boundary** |
| Validation | Zod v4 at every input boundary |
| Email | Resend + React Email (Phase 5) |
| Scheduling | Vercel Cron → protected route handler (Phase 5) |
| Monitoring | Sentry (Phase 6) |
| Tests | Vitest (unit + integration), Playwright (e2e) |
| Hosting | Vercel + Supabase Cloud |

## Commands (PowerShell-safe)

```powershell
npm run dev             # dev server
npm run build           # production build
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm run format          # prettier --write .
npm test                  # vitest run (unit only, no database needed)
npm run test:integration  # RLS cross-tenant isolation (REQUIRES local Supabase running)
npm run test:all          # both
npm run test:e2e          # playwright
npm run db:verify         # apply all migrations + seed to a throwaway Postgres and
                          # run 36 cross-tenant RLS checks. Needs only Docker.

npm run db:start        # supabase start  (needs Docker Desktop running)
npm run db:stop
npm run db:reset        # re-apply all migrations + seed
npm run db:types        # regenerate src/types/database.ts — run after EVERY migration
npm run db:push:prod    # apply migrations to production (prompts for confirmation)

npm run audit:bundle    # fail if a secret reached the client bundle (run after build)
```

## Conventions

- **Server boundary.** Anything secret lives under `src/server/**` and starts with
  `import "server-only"`. Client components may not import it — ESLint blocks the common
  cases, `server-only` fails the build, and `scripts/audit-bundle.mjs` inspects the real
  output in CI. All three layers stay.
- **Mutations** go through a server action in `src/server/actions/*`, Zod-validated at the
  top of the function, never trusting client-supplied `firm_id`.
- **Authorisation is server-side.** Hiding a button is not a permission. Every action
  re-checks the role. RLS is the floor, not the only check.
- **Supabase clients.** `@/lib/supabase/server` (RLS applies, use this) vs
  `@/server/db/admin` (service role, bypasses RLS — only cron, upload-confirm, and portal
  scope may import it).
- **Dates.** All business date logic is Asia/Kolkata. Store `timestamptz`, compute in IST
  via `src/lib/dates.ts`. Never use the server's local timezone.
- **Status transitions** live in exactly one place: `src/lib/status.ts`. Nothing else may
  write `status` directly.
- **Migrations** are files in `supabase/migrations`, never dashboard edits. After any
  migration: `npm run db:reset && npm run db:types`.
- **Tests** are mandatory for permissions, tokens, status transitions, and reminder
  scheduling. Elsewhere, test what is load-bearing; do not chase coverage.

## Repo map

```
src/app/(auth)        sign-up, login, password reset
src/app/(app)         authed firm shell: dashboard, clients, requests, templates, team, settings
src/app/p/[token]     PUBLIC client portal — no login, mobile-first
src/app/api           health, cron/reminders, portal upload URL + confirm, signed downloads
src/server            server-only: actions, services, admin db client
src/lib               env, supabase clients, status machine, permissions, validation, dates
supabase/migrations   schema + RLS, in order
tests/unit            pure logic
tests/integration     RLS cross-tenant matrix (real JWTs, every table)
tests/e2e             Playwright user journeys
```

## Status vocabulary

Postgres enum `zq_status`: `requested → awaiting_client → received → under_review → completed`,
plus `cancelled` (terminal). **`overdue` is NOT an enum member** — it is derived at read time
from `due_date` vs today in IST, for requests not yet completed or cancelled.

## Phase log

- **Phase 0 — Foundations. DONE.** Repo, Next.js + TS + Tailwind + shadcn, Supabase local
  dev initialised, Zod-validated env, ESLint/Prettier, Vitest + Playwright wired, CI on
  GitHub Actions, docs. No schema yet.
- **Phase 1 — Schema and security. DONE and VERIFIED.** 17 migrations (enums,
  helpers, tenancy, clients, templates, requests, portal tokens, documents, reminders,
  activity trail, rate limits, status-transition guard, RLS, storage, views, security
  audit), seed with two demo firms, and the manifest-driven cross-tenant isolation suite.
  `npm run db:verify` applies everything to a throwaway Postgres and passes 36 checks:
  cross-tenant read/write/delete denial, staff assigned-only scoping, anonymous denial,
  portal token scoping, the status transition guard, and schema-wide RLS coverage.
  `npm run test:integration` passes **68/68** against a real local Supabase, signing in
  as seeded users through GoTrue and going through PostgREST — the spec's Phase 2 gate.
  Phase 2 may proceed.
- Phase 2 — Auth and firm shell. NEXT.
- Phase 2 — Auth and firm shell.
- Phase 3 — Clients and requests.
- Phase 4 — Client portal and uploads.
- Phase 5 — Reminders and dashboard.
- Phase 6 — Deploy.
- Phase 7 — AI validation (flagged off).

## Gotchas discovered so far

- **Migration order matters for `language sql` functions.** Postgres validates an SQL
  function body at creation time, so a helper that queries a table must be created
  *after* that table. The membership helpers therefore live in the RLS migration, not
  in the helpers migration. `plpgsql` bodies are not validated this way, which is why
  the triggers were unaffected.
- **RLS with no policy filters rather than raising** on SELECT/UPDATE/DELETE. Assert row
  counts, not exceptions. See DECISIONS.md D-017.
- **Windows PowerShell turns native stderr into a terminating error** under
  `$ErrorActionPreference = "Stop"`, so a psql `NOTICE` aborts a script. Scripts here
  use `Continue` and check `$LASTEXITCODE`.
- **Git Bash mangles container-absolute paths** (`/app/bin/x` becomes
  `C:/Program Files/Git/app/bin/x`). Use PowerShell or `MSYS_NO_PATHCONV=1` for
  `docker run --entrypoint`.

- The parent directory `C:\Users\Ananthapadmanabhan` is itself a git repo. This project has
  its own independent repo. Always confirm `git rev-parse --show-toplevel` points at the
  Zisriq folder before committing.
- npm rejects the folder name `Zisriq` as a package name (capital letter); the package is
  named `zisriq`. Scaffolding had to happen in a subfolder and be moved up.
- `@types/node` must stay on v24 to satisfy Vitest 5's peer range.
- **A container exiting 139 with NO log output means a corrupt binary, not a platform
  bug.** Filling the C: drive pushed the Docker VM filesystem read-only mid-pull and
  left image layers truncated (GoTrue's `auth` binary was exactly 8 MiB instead of
  50 MB). Docker still reported the images as present, so every `docker pull` was a
  no-op. `docker rmi -f <image>` then `docker pull <image>` is the repair. Check the
  entrypoint's on-disk size before blaming WSL2 — a suspiciously round size is the tell.
  See DECISIONS.md D-016.
- **Docker Desktop on this machine fails to start with stale AF_UNIX sockets.** The error is
  `rename <x>.sock <x>.sock.stale: The file cannot be accessed by the system`, in either
  `%LOCALAPPDATA%\Docker
un` or `%LOCALAPPDATA%\docker-secrets-engine`. Renaming one
  directory only buys a single start attempt, because orphaned `com.docker.backend`
  processes keep re-breaking the sockets. The fix that works: kill every docker/vpnkit
  process except `com.docker.service`, run `wsl --shutdown`, rename BOTH directories, then
  relaunch Docker Desktop. Do not use "Reset to factory defaults" — it wipes all images.
  There were already five `run-orphaned-*` / `run.stale-*` directories from earlier
  occurrences, so expect this to recur.
- Vercel serverless functions cap request bodies at ~4.5 MB, so 25 MB uploads **cannot**
  pass through a route handler. See DECISIONS.md D-001.
