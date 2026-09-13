-- Verification-only shim.
--
-- The supabase/postgres image ships the auth/storage/extensions schemas, the
-- anon/authenticated/service_role roles, auth.users, auth.uid() and auth.role().
-- It does NOT ship auth.jwt() (added by GoTrue) or the storage tables (created by
-- storage-api at runtime). This recreates just enough of them to apply and
-- exercise the project's migrations without the full Supabase stack.
--
-- NOT part of the project schema. Never applied anywhere but a throwaway container.

create or replace function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb
);

alter table storage.objects enable row level security;

-- Matches Supabase's implementation: the path segments EXCLUDING the filename.
create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1 : array_length(_parts, 1) - 1];
end
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to anon, authenticated, service_role;

-- The bare image ships an OLD GoTrue schema (confirmed_at, no identities table).
-- Real Supabase -- local stack or cloud -- runs GoTrue's own migrations, which add
-- these. Bring the stub up to the modern shape so the seed can be validated as it
-- will actually run. The seed is NOT adjusted to the obsolete shape.
alter table auth.users add column if not exists email_confirmed_at timestamptz;
alter table auth.users add column if not exists email_change_token_new text default '';
alter table auth.users add column if not exists phone text;
alter table auth.users add column if not exists banned_until timestamptz;
alter table auth.users add column if not exists deleted_at timestamptz;

create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_data jsonb not null,
  provider text not null,
  provider_id text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  unique (provider_id, provider)
);
