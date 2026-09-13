-- =============================================================================
-- Row Level Security.
--
-- Deny by default: RLS is enabled on every table, and a table with no policy for
-- a given command denies that command. Policies are written `to authenticated`
-- or `to anon` explicitly, never left unrestricted, so that a portal session can
-- never fall through into a firm-user policy.
--
-- Note on FORCE: we deliberately use plain ENABLE rather than FORCE ROW LEVEL
-- SECURITY. The SECURITY DEFINER helpers below are owned by `postgres` and must
-- read `memberships` without re-entering its own policy; FORCE would reintroduce
-- exactly the recursion the helpers exist to prevent. PostgREST never connects
-- as the table owner, so there is no reachable bypass.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Access predicates. SECURITY DEFINER so they can read the tables they guard.
-- -----------------------------------------------------------------------------

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

revoke all on function app.current_firm_ids() from public;
revoke all on function app.is_member(uuid) from public;
revoke all on function app.role_in_firm(uuid) from public;
revoke all on function app.has_role(uuid, public.zq_role[]) from public;

grant execute on function app.current_firm_ids() to authenticated;
grant execute on function app.is_member(uuid) to authenticated;
grant execute on function app.role_in_firm(uuid) to authenticated;
grant execute on function app.has_role(uuid, public.zq_role[]) to authenticated;

-- Read access to a request: admins and accountants see every request in their
-- firm; staff see only the ones assigned to them.
create or replace function app.can_access_request(p_request uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
    from public.requests r
    join public.memberships m
      on m.firm_id = r.firm_id and m.user_id = (select auth.uid())
    where r.id = p_request
      and (m.role in ('admin', 'accountant') or r.assigned_to = (select auth.uid()))
  )
$fn$;

-- Write access to a request follows the same shape, but a cancelled request is
-- closed to further edits.
create or replace function app.can_write_request(p_request uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
    from public.requests r
    join public.memberships m
      on m.firm_id = r.firm_id and m.user_id = (select auth.uid())
    where r.id = p_request
      and (m.role in ('admin', 'accountant') or r.assigned_to = (select auth.uid()))
      and r.status <> 'cancelled'
  )
$fn$;

create or replace function app.shares_firm_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.firm_id = mine.firm_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user
  )
$fn$;

create or replace function app.request_id_for_item(p_item uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select ri.request_id from public.request_items ri where ri.id = p_item
$fn$;

-- The firm that owns the current portal session's request, or null.
create or replace function app.portal_firm_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select r.firm_id from public.requests r where r.id = app.portal_request_id()
$fn$;

-- True when the given item belongs to the current portal session's request.
create or replace function app.item_in_portal_request(p_item uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select app.portal_request_id() is not null
     and exists (
       select 1 from public.request_items ri
       where ri.id = p_item and ri.request_id = app.portal_request_id()
     )
$fn$;

grant execute on function app.can_access_request(uuid)     to authenticated;
grant execute on function app.can_write_request(uuid)      to authenticated;
grant execute on function app.shares_firm_with(uuid)       to authenticated;
grant execute on function app.request_id_for_item(uuid)    to authenticated, anon;
grant execute on function app.portal_firm_id()             to authenticated, anon;
grant execute on function app.item_in_portal_request(uuid) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere.
-- -----------------------------------------------------------------------------
alter table public.firms                    enable row level security;
alter table public.profiles                 enable row level security;
alter table public.memberships              enable row level security;
alter table public.invites                  enable row level security;
alter table public.clients                  enable row level security;
alter table public.checklist_templates      enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.requests                 enable row level security;
alter table public.request_items            enable row level security;
alter table public.portal_tokens            enable row level security;
alter table public.documents                enable row level security;
alter table public.reminders                enable row level security;
alter table public.activity_events          enable row level security;
alter table public.rate_limits              enable row level security;

-- =============================================================================
-- firms
-- =============================================================================
create policy firms_select_member on public.firms
  for select to authenticated
  using (id = any(app.current_firm_ids()));

create policy firms_update_admin on public.firms
  for update to authenticated
  using (app.has_role(id, array['admin']::public.zq_role[]))
  with check (app.has_role(id, array['admin']::public.zq_role[]));

-- The portal shows the firm's name. Nothing else about the firm is reachable.
create policy firms_select_portal on public.firms
  for select to anon
  using (id = app.portal_firm_id());

-- No INSERT policy: firms are created by the sign-up RPC (Phase 2).
-- No DELETE policy: firms are never deleted through the API.

-- =============================================================================
-- profiles
-- =============================================================================
create policy profiles_select_self_or_colleague on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or app.shares_firm_with(id));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No INSERT policy: rows are created by the on_auth_user_created trigger.

-- =============================================================================
-- memberships
-- =============================================================================
create policy memberships_select_member on public.memberships
  for select to authenticated
  using (firm_id = any(app.current_firm_ids()));

create policy memberships_insert_admin on public.memberships
  for insert to authenticated
  with check (app.has_role(firm_id, array['admin']::public.zq_role[]));

create policy memberships_update_admin on public.memberships
  for update to authenticated
  using (app.has_role(firm_id, array['admin']::public.zq_role[]))
  with check (app.has_role(firm_id, array['admin']::public.zq_role[]));

create policy memberships_delete_admin on public.memberships
  for delete to authenticated
  using (app.has_role(firm_id, array['admin']::public.zq_role[]));

-- A firm that loses its last admin can never be administered again, and no API
-- call should be able to produce that state.
create or replace function app.assert_firm_keeps_an_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  target_firm uuid;
  admins_left int;
begin
  target_firm := old.firm_id;

  select count(*) into admins_left
  from public.memberships m
  where m.firm_id = target_firm
    and m.role = 'admin'
    and m.id <> old.id;

  if tg_op = 'UPDATE' and new.role = 'admin' then
    admins_left := admins_left + 1;
  end if;

  if admins_left = 0 then
    raise exception 'a firm must retain at least one admin'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$fn$;

create trigger memberships_keep_an_admin
  before update or delete on public.memberships
  for each row execute function app.assert_firm_keeps_an_admin();

-- =============================================================================
-- invites
-- =============================================================================
create policy invites_select_admin on public.invites
  for select to authenticated
  using (app.has_role(firm_id, array['admin']::public.zq_role[]));

create policy invites_insert_admin on public.invites
  for insert to authenticated
  with check (app.has_role(firm_id, array['admin']::public.zq_role[]));

create policy invites_update_admin on public.invites
  for update to authenticated
  using (app.has_role(firm_id, array['admin']::public.zq_role[]))
  with check (app.has_role(firm_id, array['admin']::public.zq_role[]));

create policy invites_delete_admin on public.invites
  for delete to authenticated
  using (app.has_role(firm_id, array['admin']::public.zq_role[]));

-- =============================================================================
-- clients
--
-- Staff read all clients in their firm (they need the context around an assigned
-- request) but cannot create or change them.
-- =============================================================================
create policy clients_select_member on public.clients
  for select to authenticated
  using (firm_id = any(app.current_firm_ids()));

create policy clients_insert_manager on public.clients
  for insert to authenticated
  with check (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]));

create policy clients_update_manager on public.clients
  for update to authenticated
  using (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]))
  with check (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]));

create policy clients_delete_admin on public.clients
  for delete to authenticated
  using (app.has_role(firm_id, array['admin']::public.zq_role[]));

-- =============================================================================
-- checklist_templates / checklist_template_items
-- =============================================================================
create policy templates_select_member on public.checklist_templates
  for select to authenticated
  using (firm_id = any(app.current_firm_ids()));

create policy templates_write_manager on public.checklist_templates
  for all to authenticated
  using (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]))
  with check (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]));

create policy template_items_select_member on public.checklist_template_items
  for select to authenticated
  using (firm_id = any(app.current_firm_ids()));

create policy template_items_write_manager on public.checklist_template_items
  for all to authenticated
  using (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]))
  with check (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]));

-- =============================================================================
-- requests
-- =============================================================================
create policy requests_select_scoped on public.requests
  for select to authenticated
  using (
    firm_id = any(app.current_firm_ids())
    and (
      app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[])
      or assigned_to = (select auth.uid())
    )
  );

create policy requests_insert_manager on public.requests
  for insert to authenticated
  with check (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]));

create policy requests_update_scoped on public.requests
  for update to authenticated
  using (
    firm_id = any(app.current_firm_ids())
    and (
      app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[])
      or assigned_to = (select auth.uid())
    )
  )
  with check (
    firm_id = any(app.current_firm_ids())
    and (
      app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[])
      or assigned_to = (select auth.uid())
    )
  );

create policy requests_delete_admin on public.requests
  for delete to authenticated
  using (app.has_role(firm_id, array['admin']::public.zq_role[]));

-- The portal sees exactly one request: the one its token was minted for.
create policy requests_select_portal on public.requests
  for select to anon
  using (id = app.portal_request_id());

-- =============================================================================
-- request_items
-- =============================================================================
create policy request_items_select_scoped on public.request_items
  for select to authenticated
  using (app.can_access_request(request_id));

create policy request_items_insert_scoped on public.request_items
  for insert to authenticated
  with check (app.can_write_request(request_id));

create policy request_items_update_scoped on public.request_items
  for update to authenticated
  using (app.can_access_request(request_id))
  with check (app.can_access_request(request_id));

create policy request_items_delete_manager on public.request_items
  for delete to authenticated
  using (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]));

create policy request_items_select_portal on public.request_items
  for select to anon
  using (request_id = app.portal_request_id());

-- A portal session may move its own items, and the WITH CHECK pins the states it
-- is allowed to write -- so a bug in portal code cannot mark work complete or
-- cancel a request. The transition trigger still applies on top of this.
create policy request_items_update_portal on public.request_items
  for update to anon
  using (request_id = app.portal_request_id())
  with check (
    request_id = app.portal_request_id()
    and status in ('awaiting_client', 'received')
  );

-- =============================================================================
-- portal_tokens
--
-- Deliberately unreadable by `anon`: the portal authenticates by presenting a
-- token, which the server verifies with the service role before minting a
-- scoped JWT. A portal session never needs to read the token table.
-- =============================================================================
create policy portal_tokens_select_scoped on public.portal_tokens
  for select to authenticated
  using (app.can_access_request(request_id));

create policy portal_tokens_insert_manager on public.portal_tokens
  for insert to authenticated
  with check (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]));

create policy portal_tokens_update_manager on public.portal_tokens
  for update to authenticated
  using (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]))
  with check (app.has_role(firm_id, array['admin', 'accountant']::public.zq_role[]));

-- =============================================================================
-- documents
-- =============================================================================
create policy documents_select_scoped on public.documents
  for select to authenticated
  using (app.can_access_request(app.request_id_for_item(request_item_id)));

create policy documents_insert_scoped on public.documents
  for insert to authenticated
  with check (app.can_write_request(app.request_id_for_item(request_item_id)));

create policy documents_update_scoped on public.documents
  for update to authenticated
  using (app.can_access_request(app.request_id_for_item(request_item_id)))
  with check (app.can_access_request(app.request_id_for_item(request_item_id)));

create policy documents_delete_admin on public.documents
  for delete to authenticated
  using (app.has_role(firm_id, array['admin']::public.zq_role[]));

create policy documents_select_portal on public.documents
  for select to anon
  using (app.item_in_portal_request(request_item_id));

-- Uploads are inserted by the server AFTER content sniffing, using the portal's
-- scoped JWT. The check pins the row to this session's request and forbids a
-- portal session from writing its own review outcome.
create policy documents_insert_portal on public.documents
  for insert to anon
  with check (
    app.item_in_portal_request(request_item_id)
    and review_status = 'pending'
    and reviewed_at is null
    and uploaded_by_user is null
    and uploaded_by_token is not null
  );

-- =============================================================================
-- reminders
--
-- Readable by the firm, written only by the cron (service_role). No INSERT or
-- UPDATE policy exists for authenticated, so the API cannot forge a send record.
-- =============================================================================
create policy reminders_select_scoped on public.reminders
  for select to authenticated
  using (app.can_access_request(request_id));

-- =============================================================================
-- activity_events -- append only
--
-- SELECT and INSERT policies only. The absence of UPDATE/DELETE policies is the
-- mechanism that makes the trail immutable. Do not add them.
-- =============================================================================
create policy activity_select_member on public.activity_events
  for select to authenticated
  using (firm_id = any(app.current_firm_ids()));

create policy activity_insert_member on public.activity_events
  for insert to authenticated
  with check (
    firm_id = any(app.current_firm_ids())
    and actor_token_id is null
    and (actor_user_id is null or actor_user_id = (select auth.uid()))
  );

create policy activity_insert_portal on public.activity_events
  for insert to anon
  with check (
    firm_id = app.portal_firm_id()
    and actor_user_id is null
  );

-- =============================================================================
-- rate_limits
--
-- No policies at all. Reachable only through app.consume_rate_limit(), which is
-- SECURITY DEFINER, and by the service role. Grants revoked for good measure.
-- =============================================================================
revoke all on public.rate_limits from anon, authenticated;
