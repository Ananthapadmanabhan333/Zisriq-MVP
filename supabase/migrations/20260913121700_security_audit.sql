-- =============================================================================
-- Security self-audit.
--
-- The cross-tenant isolation suite asserts that its table manifest matches
-- reality, so that adding a table without RLS fails CI instead of passing
-- unnoticed. That check needs to read catalog metadata, which PostgREST does not
-- expose; this function is the narrow, service-role-only window onto it.
-- =============================================================================

create or replace function app.security_audit_tables()
returns table (
  table_name text,
  has_firm_id boolean,
  rls_enabled boolean,
  policy_count int,
  select_policies int,
  insert_policies int,
  update_policies int,
  delete_policies int
)
language sql
stable
security definer
set search_path = public, pg_catalog, pg_temp
as $fn$
  select
    c.relname::text as table_name,
    exists (
      select 1 from pg_attribute a
      where a.attrelid = c.oid and a.attname = 'firm_id' and a.attnum > 0 and not a.attisdropped
    ) as has_firm_id,
    c.relrowsecurity as rls_enabled,
    (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policy_count,
    (select count(*) from pg_policy p where p.polrelid = c.oid and p.polcmd in ('r', '*'))::int,
    (select count(*) from pg_policy p where p.polrelid = c.oid and p.polcmd in ('a', '*'))::int,
    (select count(*) from pg_policy p where p.polrelid = c.oid and p.polcmd in ('w', '*'))::int,
    (select count(*) from pg_policy p where p.polrelid = c.oid and p.polcmd in ('d', '*'))::int
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname
$fn$;

revoke all on function app.security_audit_tables() from public, anon, authenticated;
grant execute on function app.security_audit_tables() to service_role;

-- PostgREST exposes functions in the `public` schema, so the RPC the test calls
-- is a thin wrapper. It is still service-role-only.
create or replace function public.security_audit_tables()
returns table (
  table_name text,
  has_firm_id boolean,
  rls_enabled boolean,
  policy_count int,
  select_policies int,
  insert_policies int,
  update_policies int,
  delete_policies int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select * from app.security_audit_tables()
$fn$;

revoke all on function public.security_audit_tables() from public, anon, authenticated;
grant execute on function public.security_audit_tables() to service_role;
