-- =============================================================================
-- Tenancy: firms, profiles, memberships, invites.
-- =============================================================================

create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 200),

  -- Settings (firm profile / reminder cadence / sender name).
  email_sender_name text not null default '',
  reminder_follow_up_days int[] not null default '{3,7}',
  reminder_overdue_every_days int not null default 3 check (reminder_overdue_every_days between 1 and 30),
  reminder_overdue_cap int not null default 5 check (reminder_overdue_cap between 0 and 20),
  portal_token_ttl_days int not null default 30 check (portal_token_ttl_days between 1 and 365),

  -- Phase 7 AI validation layer, off by default.
  ai_flags_enabled boolean not null default false,
  ai_daily_cost_cap_cents int not null default 200 check (ai_daily_cost_cap_cents >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Postgres forbids subqueries in CHECK constraints, so the cadence values
  -- themselves are range-checked by Zod at the input boundary. What is enforced
  -- here is the bound that protects the reminder engine from a runaway array.
  constraint follow_up_days_sane check (
    array_length(reminder_follow_up_days, 1) is null
    or array_length(reminder_follow_up_days, 1) <= 10
  )
);

comment on column public.firms.reminder_follow_up_days is
  'Days after the request was sent on which to nudge, while any mandatory item is outstanding. Default {3,7}.';

-- One row per auth user. Identity only -- `memberships` is the sole authority
-- for authorisation. See DECISIONS.md D-009.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email extensions.citext not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.zq_role not null,
  created_at timestamptz not null default now(),
  unique (firm_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);
create index memberships_firm_idx on public.memberships (firm_id);

-- Teammate invitations. Only the hash of the invite token is stored, for the
-- same reason as portal tokens: a database leak must not yield usable links.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  email extensions.citext not null,
  role public.zq_role not null,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index invites_firm_idx on public.invites (firm_id);
create unique index invites_pending_unique
  on public.invites (firm_id, email)
  where accepted_at is null and revoked_at is null;

-- -----------------------------------------------------------------------------
-- Keep a profile row in step with auth.users.
-- -----------------------------------------------------------------------------
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- -----------------------------------------------------------------------------
-- updated_at maintenance, reused by every table that has the column.
-- -----------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger firms_touch_updated_at
  before update on public.firms
  for each row execute function app.touch_updated_at();

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function app.touch_updated_at();
