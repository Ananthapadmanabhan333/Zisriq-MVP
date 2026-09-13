-- =============================================================================
-- Read models.
--
-- `overdue` is derived here rather than stored, against the current date in
-- Asia/Kolkata -- the timezone the business actually operates in. See D-007.
--
-- Views run with the privileges of the INVOKER, so the underlying tables' RLS
-- policies still apply to whoever selects from them. Without `security_invoker`
-- a view would run as its owner and quietly bypass every policy below it, which
-- is the classic way a multi-tenant app leaks.
-- =============================================================================

create view public.v_requests_enriched
with (security_invoker = true)
as
select
  r.id,
  r.firm_id,
  r.client_id,
  r.title,
  r.period_label,
  r.period_start,
  r.period_end,
  r.due_date,
  r.assigned_to,
  r.status,
  r.sent_at,
  r.completed_at,
  r.cancelled_at,
  r.created_at,
  r.updated_at,
  r.created_by,

  c.name as client_name,
  c.type as client_type,
  c.contact_email as client_contact_email,

  -- Derived, never stored.
  (
    r.due_date is not null
    and r.status not in ('completed', 'cancelled')
    and r.due_date < app.today_ist()
  ) as is_overdue,

  case
    when r.due_date is null then null
    else r.due_date - app.today_ist()
  end as days_until_due,

  case
    when r.status = 'awaiting_client' and r.sent_at is not null
      then app.today_ist() - (r.sent_at at time zone 'Asia/Kolkata')::date
    else null
  end as days_awaiting_client,

  stats.item_count,
  stats.mandatory_count,
  stats.mandatory_outstanding,
  stats.received_count,
  (stats.mandatory_outstanding = 0) as all_mandatory_in

from public.requests r
join public.clients c on c.id = r.client_id
left join lateral (
  select
    count(*)                                                        as item_count,
    count(*) filter (where ri.is_mandatory)                         as mandatory_count,
    count(*) filter (
      where ri.is_mandatory and ri.status in ('requested', 'awaiting_client')
    )                                                               as mandatory_outstanding,
    count(*) filter (
      where ri.status in ('received', 'under_review', 'completed')
    )                                                               as received_count
  from public.request_items ri
  where ri.request_id = r.id
) stats on true;

comment on view public.v_requests_enriched is
  'Requests with derived overdue/progress fields. security_invoker so RLS still applies.';

grant select on public.v_requests_enriched to authenticated;
