-- =============================================================================
-- Document storage.
--
-- The bucket is PRIVATE. Nothing is ever served from a public bucket URL:
-- downloads happen exclusively through short-lived signed URLs minted
-- server-side after an authorisation check.
--
-- Object keys are `firm_id/client_id/request_id/<uuid>.<ext>`, with a
-- `firm_id/client_id/request_id/pending/<uuid>.<ext>` staging prefix used while
-- an upload is awaiting server-side content sniffing. See DECISIONS.md D-001.
--
-- The size limit and MIME allowlist below are the storage service's own
-- enforcement. They are a backstop, not the primary check: the server sniffs
-- magic bytes after upload, because a declared content type is caller-supplied
-- and therefore untrusted.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  26214400, -- 25 MiB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Object policies.
--
-- Signed upload and download URLs are minted server-side with the service role
-- and carry their own authorisation, so they do not depend on these policies.
-- These exist so that a client holding only an anon or user token cannot reach
-- another firm's objects by any direct route.
-- -----------------------------------------------------------------------------

create policy documents_objects_select_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid = any(app.current_firm_ids())
  );

create policy documents_objects_insert_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid = any(app.current_firm_ids())
  );

create policy documents_objects_update_member on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid = any(app.current_firm_ids())
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid = any(app.current_firm_ids())
  );

-- Deletion is an admin action, routed through a server action that also removes
-- the `documents` row. Restricting it here keeps orphaned objects from being
-- created by a staff user acting directly against storage.
create policy documents_objects_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid = any(app.current_firm_ids())
    and app.has_role((storage.foldername(name))[1]::uuid, array['admin']::public.zq_role[])
  );

-- No policy for `anon`: the client portal never touches storage directly. It
-- receives a signed upload URL from the server and PUTs to that.
