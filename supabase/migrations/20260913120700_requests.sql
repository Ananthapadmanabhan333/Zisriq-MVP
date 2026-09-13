-- =============================================================================
-- Requests: a work item for a client for a period, e.g. "GSTR-1 -- Aug 2026".
-- =============================================================================

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,

  -- restrict, not cascade: deleting a client must not silently destroy the
  -- document history attached to their requests.
  client_id uuid not null references public.clients(id) on delete restrict,

  title text not null check (length(trim(title)) between 2 and 200),

  -- Free-text label is what staff and clients read ("Aug 2026", "FY 2025-26").
  -- The date range is what queries and reminders use.
  period_label text not null check (length(trim(period_label)) between 1 and 60),
  period_start date,
  period_end date,

  due_date date,
  assigned_to uuid references public.profiles(id) on delete set null,

  status public.zq_status not null default 'requested',

  sent_at timestamptz,        -- when it first entered awaiting_client
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,

  constraint period_range_ordered check (
    period_start is null or period_end is null or period_start <= period_end
  )
);

create index requests_firm_status_due_idx on public.requests (firm_id, status, due_date);
create index requests_client_idx on public.requests (client_id, created_at desc);
create index requests_assigned_open_idx on public.requests (firm_id, assigned_to)
  where status not in ('completed', 'cancelled');

-- The reminder engine's hot query: open requests with a due date.
create index requests_awaiting_idx on public.requests (firm_id, sent_at)
  where status = 'awaiting_client';

create table public.request_items (
  id uuid primary key default gen_random_uuid(),

  -- Denormalised for uniform RLS; forced to match the parent by trigger.
  firm_id uuid not null references public.firms(id) on delete cascade,

  request_id uuid not null references public.requests(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 200),
  description text,
  is_mandatory boolean not null default true,
  sort_order int not null default 0,
  status public.zq_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index request_items_request_idx on public.request_items (request_id, sort_order);
create index request_items_outstanding_idx on public.request_items (request_id)
  where is_mandatory and status in ('requested', 'awaiting_client');

create or replace function app.sync_request_item_firm()
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
    raise exception 'request_items.request_id % does not exist', new.request_id;
  end if;

  new.firm_id := parent_firm;
  return new;
end;
$$;

create trigger request_items_sync_firm
  before insert or update on public.request_items
  for each row execute function app.sync_request_item_firm();

-- A request must belong to a client of the same firm. Without this, a caller who
-- can write to their own firm could attach a request to another firm's client.
create or replace function app.assert_request_client_same_firm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  client_firm uuid;
begin
  select c.firm_id into client_firm from public.clients c where c.id = new.client_id;

  if client_firm is null then
    raise exception 'requests.client_id % does not exist', new.client_id;
  end if;

  if client_firm <> new.firm_id then
    raise exception 'cross-tenant write rejected: client % belongs to firm %, request is for firm %',
      new.client_id, client_firm, new.firm_id;
  end if;

  return new;
end;
$$;

create trigger requests_assert_client_same_firm
  before insert or update of client_id, firm_id on public.requests
  for each row execute function app.assert_request_client_same_firm();

create trigger requests_touch_updated_at
  before update on public.requests
  for each row execute function app.touch_updated_at();

create trigger request_items_touch_updated_at
  before update on public.request_items
  for each row execute function app.touch_updated_at();
