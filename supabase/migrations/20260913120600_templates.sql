-- =============================================================================
-- Reusable checklist templates, e.g. "GST monthly", "ITR individual".
-- =============================================================================

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 200),
  description text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (firm_id, name)
);

create index checklist_templates_firm_idx on public.checklist_templates (firm_id)
  where not is_archived;

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),

  -- Denormalised from the parent template so every RLS policy in the schema can
  -- use the same `firm_id = any(app.current_firm_ids())` shape without a join.
  -- Kept honest by the trigger below.
  firm_id uuid not null references public.firms(id) on delete cascade,

  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 200),
  description text,
  is_mandatory boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index checklist_template_items_template_idx
  on public.checklist_template_items (template_id, sort_order);

-- A denormalised firm_id is a tenancy hole if it can disagree with its parent.
-- This forces it to match rather than trusting the caller to supply the right one.
create or replace function app.sync_template_item_firm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_firm uuid;
begin
  select t.firm_id into parent_firm
  from public.checklist_templates t
  where t.id = new.template_id;

  if parent_firm is null then
    raise exception 'checklist_template_items.template_id % does not exist', new.template_id;
  end if;

  new.firm_id := parent_firm;
  return new;
end;
$$;

create trigger checklist_template_items_sync_firm
  before insert or update on public.checklist_template_items
  for each row execute function app.sync_template_item_firm();

create trigger checklist_templates_touch_updated_at
  before update on public.checklist_templates
  for each row execute function app.touch_updated_at();
