-- Cross-tenant isolation checks, run the way PostgREST runs a request:
-- assume the `authenticated` (or `anon`) role and set the JWT claims GUCs.
\set ON_ERROR_STOP on
\pset pager off

\set firmA '11111111-1111-4111-8111-111111111111'
\set firmB '22222222-2222-4222-8222-222222222222'
\set adminA 'a0000001-0000-4000-8000-000000000001'
\set staffA 'a0000001-0000-4000-8000-000000000003'
\set clientB 'c2000002-0000-4000-8000-000000000001'
\set requestB '82000002-0000-4000-8000-000000000001'
\set requestA_staff '81000001-0000-4000-8000-000000000001'
\set requestA_other '81000001-0000-4000-8000-000000000003'

create or replace function pg_temp.check(label text, actual anyelement, expected anyelement)
returns void language plpgsql as $$
begin
  if actual::text is not distinct from expected::text then
    raise notice 'PASS  % (%)', label, actual;
  else
    raise warning 'FAIL  % -- expected %, got %', label, expected, actual;
  end if;
end $$;

create or replace function pg_temp.check_rows(label text, stmt text, expected int)
returns void language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n = expected then
    raise notice 'PASS  % (% rows)', label, n;
  else
    raise warning 'FAIL  % -- expected % rows, got %', label, expected, n;
  end if;
end $$;

create or replace function pg_temp.expect_error(label text, stmt text)
returns void language plpgsql as $$
begin
  execute stmt;
  raise warning 'FAIL  % -- statement unexpectedly SUCCEEDED', label;
exception when others then
  raise notice 'PASS  % (rejected: %)', label, left(sqlerrm, 60);
end $$;

-- =============================================================================
\echo ''
\echo '--- Firm A admin ---'
begin;
set local role authenticated;
set local request.jwt.claim.sub = :'adminA';

select pg_temp.check('sees own firm clients',
  (select count(*) from clients), 5::bigint);

select pg_temp.check('sees ZERO firm B clients',
  (select count(*) from clients where firm_id = :'firmB'::uuid), 0::bigint);

select pg_temp.check('sees own firm row only',
  (select count(*) from firms), 1::bigint);

select pg_temp.check('sees ZERO firm B requests',
  (select count(*) from requests where firm_id = :'firmB'::uuid), 0::bigint);

select pg_temp.check('sees ZERO firm B documents',
  (select count(*) from documents where firm_id = :'firmB'::uuid), 0::bigint);

select pg_temp.check('sees ZERO firm B portal tokens',
  (select count(*) from portal_tokens where firm_id = :'firmB'::uuid), 0::bigint);

select pg_temp.check_rows('UPDATE of firm B client affects 0 rows',
  format('update clients set notes = ''tampered'' where id = %L', :'clientB'), 0);

select pg_temp.check_rows('DELETE of firm B client affects 0 rows',
  format('delete from clients where id = %L', :'clientB'), 0);

select pg_temp.expect_error('INSERT client into firm B',
  format('insert into clients (firm_id, name, type) values (%L, %L, %L)',
         :'firmB', 'Injected', 'company'));

select pg_temp.expect_error('INSERT request into firm B',
  format('insert into requests (firm_id, client_id, title, period_label) values (%L, %L, %L, %L)',
         :'firmB', :'clientB', 'Injected', 'Aug 2026'));

-- NOTE: with RLS enabled and NO update/delete policy, Postgres does not raise --
-- it evaluates the missing USING clause as false, so the statement succeeds while
-- matching zero rows. Asserting an exception here would be wrong; assert the row
-- count instead. See DECISIONS.md D-017.
select pg_temp.check_rows('UPDATE activity_events affects 0 rows (append-only)',
  'update activity_events set verb = ''tampered''', 0);

select pg_temp.check_rows('DELETE activity_events affects 0 rows (append-only)',
  'delete from activity_events', 0);

select pg_temp.check('activity_events content untouched',
  (select count(*) from activity_events where verb = 'tampered'), 0::bigint);
rollback;

-- =============================================================================
\echo ''
\echo '--- Firm A staff (assigned-only scoping) ---'
begin;
set local role authenticated;
set local request.jwt.claim.sub = :'staffA';

select pg_temp.check('every visible request is assigned to them',
  (select count(*) from requests where assigned_to is distinct from :'staffA'::uuid), 0::bigint);

select pg_temp.check('sees at least one assigned request',
  (select count(*) > 0 from requests), true);

select pg_temp.check('cannot see a colleague''s request',
  (select count(*) from requests where id = :'requestA_other'::uuid), 0::bigint);

select pg_temp.check('CAN still read firm clients (needs context)',
  (select count(*) from clients), 5::bigint);

select pg_temp.expect_error('staff INSERT client',
  format('insert into clients (firm_id, name, type) values (%L, %L, %L)',
         :'firmA', 'Staff Made', 'individual'));
rollback;

-- =============================================================================
\echo ''
\echo '--- Anonymous, no portal token ---'
begin;
set local role anon;

select pg_temp.check('anon sees no clients',  (select count(*) from clients), 0::bigint);
select pg_temp.check('anon sees no requests', (select count(*) from requests), 0::bigint);
select pg_temp.check('anon sees no firms',    (select count(*) from firms), 0::bigint);
select pg_temp.check('anon cannot read portal_tokens',
  (select count(*) from portal_tokens), 0::bigint);
rollback;

-- =============================================================================
\echo ''
\echo '--- Portal session scoped to one request ---'
begin;
set local role anon;
set local request.jwt.claims = '{"role":"anon","portal_request_id":"82000002-0000-4000-8000-000000000001"}';

select pg_temp.check('portal sees exactly its own request',
  (select count(*) from requests), 1::bigint);

select pg_temp.check('portal request is the right one',
  (select id from requests), :'requestB'::uuid);

select pg_temp.check('portal sees its items',
  (select count(*) > 0 from request_items), true);

select pg_temp.check('portal sees only its items',
  (select count(*) from request_items where request_id <> :'requestB'::uuid), 0::bigint);

select pg_temp.check('portal sees the firm name row',
  (select count(*) from firms), 1::bigint);

select pg_temp.check('portal sees no clients',
  (select count(*) from clients), 0::bigint);

select pg_temp.check('portal still cannot read portal_tokens',
  (select count(*) from portal_tokens), 0::bigint);

select pg_temp.expect_error('portal cannot cancel its request items',
  format('update request_items set status = ''cancelled'' where request_id = %L', :'requestB'));
rollback;

-- =============================================================================
\echo ''
\echo '--- Status transition guard ---'
begin;
select pg_temp.expect_error('requested -> completed (illegal skip)',
  format('update requests set status = ''completed'' where id = %L', :'requestB'));
rollback;

begin;
select pg_temp.check('completed is terminal',
  (select app.status_transition_allowed('completed', 'under_review')), false);
select pg_temp.check('awaiting_client -> received is legal',
  (select app.status_transition_allowed('awaiting_client', 'received')), true);
rollback;

-- =============================================================================
\echo ''
\echo '--- Schema-wide RLS coverage ---'
select pg_temp.check('every public table has RLS enabled',
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 0::bigint);

select pg_temp.check('activity_events has no UPDATE/DELETE policy',
  (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid
   where c.relname = 'activity_events' and p.polcmd in ('w','d')), 0::bigint);

select pg_temp.check('v_requests_enriched is security_invoker',
  (select reloptions::text like '%security_invoker=true%'
   from pg_class where relname = 'v_requests_enriched'), true);

select pg_temp.check('documents bucket is private',
  (select not public from storage.buckets where id = 'documents'), true);
