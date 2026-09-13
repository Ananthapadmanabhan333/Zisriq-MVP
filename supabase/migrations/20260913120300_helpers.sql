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
-- NOTE: the membership-dependent helpers (current_firm_ids, is_member,
-- role_in_firm, has_role) deliberately live in the RLS migration instead of
-- here. A `language sql` function body is validated when it is created, and
-- those query public.memberships, which does not exist yet at this point in the
-- migration order.

create schema if not exists app;

grant usage on schema app to authenticated, anon, service_role;

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

grant execute on function app.portal_request_id() to authenticated, anon;
grant execute on function app.today_ist() to authenticated, anon;
