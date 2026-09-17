# Deploying Zisriq

Vercel for the app, Supabase Cloud for Postgres, Auth and Storage.

Nothing here is automated on purpose. Every step below either costs money or is
hard to undo, so each one is a decision someone makes rather than a script that
runs.

---

## 1. Create the Supabase project

1. New project at [supabase.com/dashboard](https://supabase.com/dashboard).
   Pick the region closest to your clients — for an Indian firm that is
   **Mumbai (ap-south-1)**. Region cannot be changed later.
2. Save the database password somewhere durable. It is shown once.
3. **Project Settings → General** gives you the reference id.

## 2. Apply the schema

```bash
npx supabase link --project-ref <your-ref>
npm run db:push:prod
```

`db:push` applies migrations only. It never drops anything, and it never runs
`supabase/seed.sql` — the seed creates two fictional demo firms and must never
reach production.

> **Do not run `supabase db reset --linked` against production.** It drops the
> public schema. The cloud-dev helper (`npm run db:setup:cloud`) does exactly
> that, which is why it makes you retype the project ref first. It is for
> throwaway development projects only.

Verify before going further:

```bash
npx supabase migration list --linked
```

## 3. Storage

The `documents` bucket is created by migration `20260913121500_storage.sql`,
private, capped at 25 MB with a MIME allowlist. Confirm in **Storage** that it
exists and that **Public** is off.

If it is public, stop and fix it. Every document in the product is a client's
financial record.

## 4. Deploy to Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). Framework is
detected automatically.

Set these in **Settings → Environment Variables**, for Production:

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Public, RLS-bound |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **Secret. Bypasses RLS.** |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API → JWT | Secret |
| `APP_URL` | Your domain, no trailing slash | Used to build portal links |
| `CRON_SECRET` | `openssl rand -base64 32` | Secret. Guards the cron route |
| `RESEND_API_KEY` | Resend dashboard | Secret. Without it, email only logs |
| `EMAIL_FROM` | e.g. `Zisriq <noreply@yourfirm.in>` | Must be a verified sender |
| `SENTRY_DSN` | Sentry project | Optional |

`APP_URL` being wrong is the failure that hurts most: portal links are built from
it, so a stale value emails clients a link to the wrong host.

The service role key must only ever be set as a server-side variable. It grants
unrestricted read and write across every firm. `npm run audit:bundle` inspects
the real build output and fails if any secret reached the client bundle — CI runs
it, and so should you before a manual deploy.

## 5. Email

1. Add and verify your sending domain in Resend.
2. Set SPF and DKIM as instructed. Without them, reminders land in spam, and a
   reminder in spam is worse than no reminder: the firm believes the client was
   chased.
3. Send yourself a test reminder before telling clients to expect them.

## 6. Cron

`vercel.json` registers `/api/cron/reminders` at `30 3 * * *` UTC, which is
09:00 IST. Vercel picks this up on deploy; confirm under **Settings → Cron Jobs**.

Vercel sends the `CRON_SECRET` as a bearer token. The route compares it in
constant time and answers **404** — not 401 — to anything else, so an
unauthenticated caller cannot even confirm the endpoint exists.

Trigger it manually once to check:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/reminders
```

It returns `{ ok, today, sent, skipped, failed }`. A high `skipped` on the first
run is normal: nothing is due yet.

## 7. Before you let a real client in

- [ ] Sign up, create a firm, add a client, send a request, upload a file as the
      client, from a phone on mobile data — not just localhost.
- [ ] Confirm the storage bucket is private.
- [ ] Confirm a portal link stops working after you cancel its request.
- [ ] Confirm a second firm cannot see the first one's data. `npm run
      test:integration` proves this locally; the same RLS policies are what got
      pushed.
- [ ] Set a real `CRON_SECRET`, not a placeholder.
- [ ] Take a database backup and practise restoring it. Supabase does daily
      backups on paid plans; on free, you are the backup.

## Rolling back

Vercel keeps previous deployments — promote one from the dashboard to roll back
the app instantly.

**The database does not roll back with it.** Migrations are forward-only. If a
migration is wrong, write a new migration that corrects it; never edit one that
has already been applied to production, because the hash is what tells Supabase
which have run.

## What is deliberately not here

No staging environment, no preview database, no CDN configuration, no custom
Sentry release pipeline. V1 is one firm's workflow tool. Add these when the cost
of not having them is real, not before.
