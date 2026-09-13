-- =============================================================================
-- Status transitions -- enforced in exactly one place.
--
-- The legal moves are:
--
--   requested       -> awaiting_client | cancelled
--   awaiting_client -> received        | cancelled
--   received        -> under_review    | awaiting_client | cancelled
--   under_review    -> completed       | awaiting_client | received | cancelled
--   completed       -> (terminal)
--   cancelled       -> (terminal)
--
-- `under_review -> awaiting_client` is how a rejection sends work back to the
-- client. `completed` and `cancelled` are terminal: reopening is not a
-- transition, it is a new request.
-- =============================================================================

create or replace function app.status_transition_allowed(
  p_from public.zq_status,
  p_to public.zq_status
)
returns boolean
language sql
immutable
as $$
  select case p_from
    when 'requested'       then p_to in ('awaiting_client', 'cancelled')
    when 'awaiting_client' then p_to in ('received', 'cancelled')
    when 'received'        then p_to in ('under_review', 'awaiting_client', 'cancelled')
    when 'under_review'    then p_to in ('completed', 'awaiting_client', 'received', 'cancelled')
    when 'completed'       then false
    when 'cancelled'       then false
  end
$$;

create or replace function app.assert_status_transition()
returns trigger
language plpgsql
as $$
begin
  -- A write that does not move the status is not a transition.
  if new.status = old.status then
    return new;
  end if;

  if not app.status_transition_allowed(old.status, new.status) then
    raise exception
      'illegal status transition % -> % on %.%',
      old.status, new.status, tg_table_name, old.id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger requests_assert_status_transition
  before update of status on public.requests
  for each row execute function app.assert_status_transition();

create trigger request_items_assert_status_transition
  before update of status on public.request_items
  for each row execute function app.assert_status_transition();

-- -----------------------------------------------------------------------------
-- Timestamp bookkeeping that must not drift from the status it describes.
-- -----------------------------------------------------------------------------
create or replace function app.stamp_request_status_times()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'awaiting_client' and new.sent_at is null then
    new.sent_at := now();
  end if;

  if new.status = 'completed' then
    new.completed_at := now();
  end if;

  if new.status = 'cancelled' then
    new.cancelled_at := now();
  end if;

  return new;
end;
$$;

create trigger requests_stamp_status_times
  before update of status on public.requests
  for each row execute function app.stamp_request_status_times();

grant execute on function app.status_transition_allowed(public.zq_status, public.zq_status)
  to authenticated, anon;
