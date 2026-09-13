-- =============================================================================
-- Clients of the firm.
--
-- PAN and GSTIN are validated by FORMAT ONLY. PAN's 4th character encodes
-- holder type, which invites cross-checking against `type` -- that would reject
-- valid data, because a proprietorship files under the proprietor's individual
-- 'P' PAN. See DECISIONS.md D-006. The GSTIN checksum is verified in the
-- application layer (src/lib/validation/india.ts), not here.
-- =============================================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,

  name text not null check (length(trim(name)) between 2 and 200),
  type public.zq_client_type not null,

  pan text check (pan is null or pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  gstin text check (
    gstin is null
    or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'
  ),

  contact_name text,
  contact_email extensions.citext,
  contact_phone text,

  is_active boolean not null default true,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index clients_firm_name_idx on public.clients (firm_id, name);
create index clients_firm_active_idx on public.clients (firm_id) where is_active;

-- Search across the fields a user would actually type into the filter box.
create index clients_search_idx on public.clients
  using gin (to_tsvector('simple',
    coalesce(name, '') || ' ' || coalesce(contact_name, '') || ' ' ||
    coalesce(pan, '') || ' ' || coalesce(gstin, '')));

-- PAN is unique within a firm when present: two client records with the same
-- PAN is a data-entry mistake, not a legitimate case.
create unique index clients_firm_pan_unique
  on public.clients (firm_id, pan) where pan is not null;

create trigger clients_touch_updated_at
  before update on public.clients
  for each row execute function app.touch_updated_at();
