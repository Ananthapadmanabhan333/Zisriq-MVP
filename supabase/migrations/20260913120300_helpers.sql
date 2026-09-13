-- =============================================================================
-- Authorisation helpers.
--
-- Every one of these is SECURITY DEFINER and reads `memberships`. That is the
-- whole point: a policy on `memberships` that itself queried `memberships`
-- would recurse infinitely. Marking them STABLE lets Postgres evaluate them
-- once per statement rather than once per row.
--
-- search_path is pinned on every function so a caller cannot shadow `public`
-- with their own schema and change what these resolve to.
-- =============================================================================
create schema if not exists app;

grant usage on schema app to authenticated, anon, service_role;

-- Firms the current user holds a membership in. Empty array for anon.
create or replace function app.current_firm_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(m.firm_id), '{}'::uuid[])
  from public.memberships m
  where m.user_id = (select auth.uid())
$$;

create or replace function app.is_member(p_firm uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid()) and m.firm_id = p_firm
  )
$$;

-- A user has at most one membership per firm (enforced by a unique constraint),
-- so this is single-valued.
create or replace function app.role_in_firm(p_firm uuid)
returns public.zq_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role from public.memberships m
  where m.user_id = (select auth.uid()) and m.firm_id = p_firm
  limit 1
$$;

create or replace function app.has_role(p_firm uuid, p_roles public.zq_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid())
      and m.firm_id = p_firm
      and m.role = any(p_roles)
  )
$$;

-- -----------------------------------------------------------------------------
-- Client portal scope.
--
-- The portal has no logged-in user. After verifying a presented token against
-- portal_tokens.token_hash, the server mints a short-lived JWT carrying a
-- `portal_request_id` claim. RLS policies key off this function, so the database
-- -- not application code -- is what stops one client seeing another's request.
-- See DECISIONS.md D-004.
-- -----------------------------------------------------------------------------
create or replace function app.portal_request_id()
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select nullif(
    coalesce(
      auth.jwt() ->> 'portal_request_id',
      current_setting('request.jwt.claims', true)::jsonb ->> 'portal_request_id'
    ),
    ''
  )::uuid
$$;

-- Today, in the timezone the business actually operates in. Every due-date and
-- overdue comparison must go through this rather than the server's locale.
create or replace function app.today_ist()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

revoke all on function app.current_firm_ids() from public;
revoke all on function app.is_member(uuid) from public;
revoke all on function app.role_in_firm(uuid) from public;
revoke all on function app.has_role(uuid, public.zq_role[]) from public;

grant execute on function app.current_firm_ids() to authenticated;
grant execute on function app.is_member(uuid) to authenticated;
grant execute on function app.role_in_firm(uuid) to authenticated;
grant execute on function app.has_role(uuid, public.zq_role[]) to authenticated;
grant execute on function app.portal_request_id() to authenticated, anon;
grant execute on function app.today_ist() to authenticated, anon;
