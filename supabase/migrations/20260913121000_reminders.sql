-- =============================================================================
-- Reminder ledger.
--
-- The cron handler is required to be idempotent: re-running it must never
-- double-send. That guarantee lives in the unique index below rather than in
-- application logic -- the handler inserts the row it is about to send, and a
-- duplicate insert is rejected by the database.
-- =============================================================================

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,

  channel text not null default 'email' check (channel in ('email')),
  type public.zq_reminder_type not null,

  -- Which nudge in the series this is: the nth follow-up or nth overdue notice.
  sequence_no int not null default 0 check (sequence_no >= 0),

  scheduled_for date not null,
  sent_at timestamptz,
  status public.zq_reminder_status not null default 'scheduled',
  error text,

  -- Who the internal digest went to; null for client-facing reminders.
  recipient_user_id uuid references public.profiles(id) on delete set null,

  created_at timestamptz not null default now()
);

-- THE idempotency guarantee.
create unique index reminders_idempotent
  on public.reminders (request_id, type, sequence_no, scheduled_for);

create index reminders_firm_idx on public.reminders (firm_id, scheduled_for desc);
create index reminders_request_idx on public.reminders (request_id, created_at desc);

create or replace function app.sync_reminder_firm()
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
    raise exception 'reminders.request_id % does not exist', new.request_id;
  end if;

  new.firm_id := parent_firm;
  return new;
end;
$$;

create trigger reminders_sync_firm
  before insert or update on public.reminders
  for each row execute function app.sync_reminder_firm();
