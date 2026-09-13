-- =============================================================================
-- Rate limiting.
--
-- Serverless instances share no memory, so an in-process counter limits nothing.
-- This is a fixed-window counter in Postgres, reached through a SECURITY DEFINER
-- RPC so that callers cannot read or forge other keys. See DECISIONS.md D-005.
-- =============================================================================

create table public.rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  count int not null default 0
);

-- Returns true when the call is ALLOWED, false when the caller is over budget.
-- One round trip, atomic under concurrency via ON CONFLICT.
create or replace function app.consume_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count int;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'invalid rate limit configuration';
  end if;

  insert into public.rate_limits (key, window_started_at, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set
      -- Window expired: start a fresh one. Otherwise increment in place.
      window_started_at = case
        when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
          then now()
        else public.rate_limits.window_started_at
      end,
      count = case
        when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
          then 1
        else public.rate_limits.count + 1
      end
  returning count into current_count;

  return current_count <= p_limit;
end;
$$;

-- Housekeeping, called by the daily cron.
create or replace function app.prune_rate_limits(p_older_than_hours int default 24)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed int;
begin
  delete from public.rate_limits
  where window_started_at < now() - make_interval(hours => p_older_than_hours);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function app.consume_rate_limit(text, int, int) from public;
revoke all on function app.prune_rate_limits(int) from public;
grant execute on function app.consume_rate_limit(text, int, int) to service_role;
grant execute on function app.prune_rate_limits(int) to service_role;
