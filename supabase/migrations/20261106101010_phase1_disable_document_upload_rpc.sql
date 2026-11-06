-- Keep document upload RPCs unavailable while the document feature is hard-disabled.
-- This closes the direct PostgREST/RPC path that bypasses the application route gate.

begin;

revoke execute on function public.create_document_upload(
  uuid, text, text, uuid, text, text, bigint
) from public, anon, authenticated;

revoke execute on function public.can_upload_document(
  uuid, text, text, uuid
) from public, anon, authenticated;

-- Trigger functions do not need caller-controlled search_path resolution.
alter function app.audit_no_change() set search_path = '';
alter function app.touch_updated_at() set search_path = '';

commit;
