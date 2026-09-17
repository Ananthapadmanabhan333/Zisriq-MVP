-- Firm creation is the one write that RLS cannot express.
--
-- Every policy in this schema scopes rows by "firms the caller is a member of".
-- Creating a firm is circular against that rule: at the moment of the insert the
-- caller is a member of nothing, so an ordinary `insert into firms` is denied,
-- and the membership that would grant access cannot be written first because it
-- references a firm that does not exist yet.
--
-- Rather than loosen the firms insert policy -- which would let any authenticated
-- user mint unlimited firms, and is a hole that only ever widens -- this is a
-- single SECURITY DEFINER function that creates the firm, the owner membership
-- and the audit row together, in one transaction. It is the only sanctioned way
-- to bring a firm into existence.

create or replace function public.create_firm_with_owner(p_name text)
returns uuid
language plpgsql
security definer
-- Pinned search_path: without it a caller could shadow `public` and have the
-- definer's rights execute their own table. Mandatory on every definer function.
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_firm uuid;
  v_name text := trim(p_name);
begin
  if v_user is null then
    raise exception 'not authenticated'
      using errcode = '42501';
  end if;

  -- Length is checked here as well as by the table constraint so the caller gets
  -- a readable message rather than a constraint violation.
  if length(v_name) < 2 or length(v_name) > 200 then
    raise exception 'firm name must be between 2 and 200 characters'
      using errcode = '22023';
  end if;

  -- V1 gives a user exactly one firm. Without this, a double-submitted
  -- onboarding form creates a second firm that the user can never reach,
  -- because getSession() picks a single membership.
  if exists (select 1 from public.memberships m where m.user_id = v_user) then
    raise exception 'you already belong to a firm'
      using errcode = '23505';
  end if;

  insert into public.firms (name)
  values (v_name)
  returning id into v_firm;

  insert into public.memberships (firm_id, user_id, role)
  values (v_firm, v_user, 'admin');

  -- The label is denormalised into metadata on purpose: the activity trail must
  -- still read correctly after the firm is renamed, and it is a record of what
  -- happened at the time, not a live view.
  insert into public.activity_events (firm_id, actor_user_id, verb, target_type, target_id, metadata)
  values (v_firm, v_user, 'firm.created', 'firm', v_firm, jsonb_build_object('label', v_name));

  return v_firm;
end;
$$;

comment on function public.create_firm_with_owner(text) is
  'Creates a firm and its first admin membership atomically. The only supported '
  'way to create a firm; see the migration header for why RLS cannot do this.';

-- Definer functions are executable by PUBLIC unless revoked, which would expose
-- this to the anon role on the public portal.
revoke all on function public.create_firm_with_owner(text) from public;
grant execute on function public.create_firm_with_owner(text) to authenticated;
