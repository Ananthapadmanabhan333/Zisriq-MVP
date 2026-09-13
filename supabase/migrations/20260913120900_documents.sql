-- =============================================================================
-- Uploaded documents.
--
-- Object keys are `firm_id/client_id/request_id/<uuid>.<ext>` where the
-- extension comes from the SNIFFED content type, never the client's filename.
-- The original filename is kept here for display and for the download
-- Content-Disposition. See DECISIONS.md D-002.
-- =============================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  request_item_id uuid not null references public.request_items(id) on delete cascade,

  storage_path text not null unique,
  original_filename text not null check (length(original_filename) between 1 and 255),
  mime_type text not null,          -- as declared by the uploader
  sniffed_mime text,                -- as determined server-side from magic bytes
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),

  -- Exactly one uploader: a staff user, or a client acting through a portal token.
  uploaded_by_user uuid references public.profiles(id) on delete set null,
  uploaded_by_token uuid references public.portal_tokens(id) on delete set null,

  review_status public.zq_doc_review not null default 'pending',
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_notes text,
  reviewed_at timestamptz,

  -- Phase 7: advisory AI flags. Never blocks, never changes a status.
  review_flags jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint exactly_one_uploader check (
    num_nonnulls(uploaded_by_user, uploaded_by_token) = 1
  ),
  constraint review_fields_consistent check (
    (review_status = 'pending' and reviewed_at is null)
    or (review_status <> 'pending' and reviewed_at is not null)
  )
);

create index documents_item_idx on public.documents (request_item_id, created_at desc);
create index documents_firm_pending_idx on public.documents (firm_id, created_at desc)
  where review_status = 'pending';

create or replace function app.sync_document_firm()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_firm uuid;
begin
  select ri.firm_id into parent_firm
  from public.request_items ri where ri.id = new.request_item_id;

  if parent_firm is null then
    raise exception 'documents.request_item_id % does not exist', new.request_item_id;
  end if;

  new.firm_id := parent_firm;
  return new;
end;
$$;

create trigger documents_sync_firm
  before insert or update on public.documents
  for each row execute function app.sync_document_firm();

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function app.touch_updated_at();
