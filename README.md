# Zisriq

Document collection and follow-up for Indian CA and accounting firms.

A firm creates a client, generates a document checklist, and sends a secure upload link.
Zisriq tracks what is missing, chases the client automatically, and shows the firm one
dashboard of what is blocked and on whom. Clients upload from their phone without creating
an account.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20.9+ (24 recommended) | `node -v` |
| npm | 10+ | ships with Node |
| Docker Desktop | any current | required for the local Supabase stack; must be **running** |
| Git | any current | |

Windows/PowerShell is the supported development environment. Every command below works in
PowerShell.

---

## Setup

### 1. Install dependencies

```powershell
npm install
```

### 2. Start the local Supabase stack

Make sure Docker Desktop is running, then:

```powershell
npm run db:start
```

First run pulls several container images and takes a few minutes. When it finishes it prints
a block of values — keep the terminal open, you need them in the next step:

```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOi...
service_role key: eyJhbGciOi...
JWT secret: super-secret-jwt-token-...
```

### 3. Create your local env file

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` and fill in, from the output above:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | the **API URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **anon key** |
| `SUPABASE_SERVICE_ROLE_KEY` | the **service_role key** |
| `SUPABASE_JWT_SECRET` | the **JWT secret** |
| `APP_URL` | `http://localhost:3000` |

Leave `RESEND_API_KEY` blank — in development, email is written to the console instead of
being sent. `ANTHROPIC_API_KEY` and `SENTRY_DSN` can stay blank until Phases 7 and 6.

If you lose the values, `npm run db:status` prints them again.

### 4. Run the app

```powershell
npm run dev
```

Open http://localhost:3000.

### 5. Install Playwright browsers (once, before running e2e tests)

```powershell
npx playwright install chromium
```

---

## Everyday commands

```powershell
npm run dev             # dev server
npm run build           # production build
npm run typecheck       # TypeScript, no emit
npm run lint            # ESLint
npm run format          # Prettier, write
npm test                # unit tests (Vitest) - no database needed
npm run test:integration  # RLS cross-tenant isolation - needs the local stack running
npm run test:all        # both
npm run test:e2e        # end-to-end tests (Playwright)
```

Database:

```powershell
npm run db:start        # start local Supabase
npm run db:stop         # stop it
npm run db:reset        # drop, re-apply every migration, re-seed
npm run db:status       # print local URLs and keys
npm run db:types        # regenerate src/types/database.ts — run after every migration
```

### Developing against a cloud project instead of the local stack

The local Docker stack is the default, but Supabase's Realtime container segfaults
under WSL2 on some Windows machines (`/app/bin/migrate` -> exit 139), which blocks
`supabase start` entirely. If you hit that, develop against a free Supabase Cloud
project instead. It is the same Postgres, and it is the production target anyway.

1. Create a project at https://supabase.com/dashboard (free tier is fine). Choose a
   region close to you and **save the database password** — you need it in step 3.
   Name it something that makes clear it is not production, e.g. `zisriq-dev`.

2. Copy `.env.example` to `.env.local` and fill in, from
   **Project Settings > API** and **> General**:

   | Variable | Where |
   |---|---|
   | `SUPABASE_PROJECT_REF` | Settings > General > Reference ID |
   | `NEXT_PUBLIC_SUPABASE_URL` | Settings > API > Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings > API > anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Settings > API > service_role key |
   | `SUPABASE_JWT_SECRET` | Settings > API > JWT Settings > JWT Secret |
   | `APP_URL` | `http://localhost:3000` |

3. Apply the schema and seed:

   ```powershell
   npm run db:setup:cloud
   ```

   This links the repo, lists the migrations, then asks you to retype the project ref
   before it runs `supabase db reset --linked`. **That drops and rebuilds the public
   schema on the remote project**, so only ever point it at a throwaway dev project.

4. Verify tenant isolation:

   ```powershell
   npm run test:integration
   ```

### If Docker Desktop will not start

A recurring fault on Windows leaves stale Unix-socket files that Docker cannot remove, and it
quits with *"An unexpected error occurred"* mentioning `.sock.stale` and *"The file cannot be
accessed by the system"*. Do **not** click "Reset to factory defaults" — that deletes every
image and container you have. Run this instead, then start Docker Desktop again:

```powershell
Get-Process | Where-Object { $_.Name -match 'docker|vpnkit|wslrelay' -and $_.Name -ne 'com.docker.service' } | Stop-Process -Force
wsl --shutdown
Move-Item "$env:LOCALAPPDATA\Docker
un" "$env:LOCALAPPDATA\Docker
un.broken" -Force
Move-Item "$env:LOCALAPPDATA\docker-secrets-engine" "$env:LOCALAPPDATA\docker-secrets-engine.broken" -Force
```

Killing the orphaned `com.docker.backend` processes is the part that matters: without it,
Docker recreates the sockets and immediately breaks them again.

---

## Project layout

```
src/app/(auth)        sign-up, login, password reset
src/app/(app)         authed firm shell: dashboard, clients, requests, templates, team, settings
src/app/p/[token]     public client portal — no login required
src/app/api           health, cron, portal upload endpoints, signed downloads
src/server            server-only modules (secrets never leave this directory)
src/lib               env, Supabase clients, validation, dates, status machine
supabase/migrations   schema and RLS policies, applied in order
tests/                unit, integration (RLS isolation), e2e
```

---

## Security model, in one paragraph

Every business table carries `firm_id` and has Row Level Security enabled with deny-by-default
policies; a user reads only rows for firms they hold a membership in. The storage bucket is
private and downloads happen exclusively through short-lived signed URLs generated after a
server-side authorisation check. Clients access the portal through an unguessable, single-request
token of which only a hash is stored, and which expires and can be revoked. Secrets live under
`src/server/**` behind `server-only`, and CI fails the build if any of them appear in a client
chunk.

See `DECISIONS.md` for the reasoning behind the non-obvious choices, and `CLAUDE.md` for
conventions.

---

## Deployment

See `DEPLOYMENT.md` (written in Phase 6).
