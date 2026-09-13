-- =============================================================================
-- Client portal tokens.
--
-- Only a hash is stored, so a database leak yields no usable links. Tokens are
-- single-request scoped, expire, and can be revoked. A token grants exactly:
-- view that request's checklist, upload against it, see what is still missing.
-- =============================================================================

create table public.portal_tokens (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,

  -- sha256 of the opaque token. The token itself is shown to the issuing user
  -- exactly once and is never persisted.
  token_hash bytea not null unique,

  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  last_used_at timestamptz,
  use_count int not null default 0,

  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index portal_tokens_request_idx on public.portal_tokens (request_id, created_at desc);

-- At most one live token per request: regenerating must revoke the old one, so a
-- link the firm believes it has withdrawn cannot still work.
create unique index portal_tokens_one_live_per_request
  on public.portal_tokens (request_id)
  where revoked_at is null;

create or replace function app.sync_portal_token_firm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_firm uuid;
begin
  select r.firm_id into parent_firm from public.requests r where r.id = new.request_id;

  if parent_firm is null then
    raise exception 'portal_tokens.request_id % does not exist', new.request_id;
  end if;

  new.firm_id := parent_firm;
  return new;
end;
$$;

create trigger portal_tokens_sync_firm
  before insert or update on public.portal_tokens
  for each row execute function app.sync_portal_token_firm();

-- Convenience predicate used by both the portal RLS policies and the server.
create or replace function app.portal_token_is_live(p_token public.portal_tokens)
returns boolean
language sql
immutable
as $$
  select p_token.revoked_at is null and p_token.expires_at > now()
$$;
