-- Stockage privé des documents métier.
-- Les fichiers sont écrits uniquement par le serveur avec la clé service_role.
-- Les utilisateurs authentifiés ne peuvent lire que les objets disponibles
-- et autorisés par le module métier auquel le document est rattaché.

begin;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'company-private-documents',
  'company-private-documents',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  module_code text not null check (
    module_code in (
      'company', 'customers', 'suppliers', 'invoices', 'payments',
      'expenses', 'treasury', 'budgets', 'payroll', 'members', 'audit'
    )
  ),
  entity_type text not null check (
    (module_code = 'company' and entity_type = 'company')
    or (module_code = 'customers' and entity_type = 'customer')
    or (module_code = 'suppliers' and entity_type = 'supplier')
    or (module_code = 'invoices' and entity_type = 'invoice')
    or (module_code = 'payments' and entity_type = 'payment')
    or (module_code = 'expenses' and entity_type = 'expense')
    or (module_code = 'treasury' and entity_type = 'cash_account')
    or (module_code = 'budgets' and entity_type = 'budget')
    or (module_code = 'payroll' and entity_type in ('employee', 'payslip', 'payroll_run'))
    or (module_code = 'members' and entity_type = 'membership')
    or (module_code = 'audit' and entity_type = 'audit_event')
  ),
  entity_id uuid not null,
  storage_path text not null unique,
  original_name text not null check (
    original_name = btrim(original_name)
    and char_length(original_name) between 1 and 180
    and original_name !~ '[[:cntrl:]]'
  ),
  mime_type text not null check (
    mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  byte_size bigint not null check (byte_size between 1 and 20971520),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  scan_status text not null default 'pending_upload'
    check (scan_status in ('pending_upload', 'pending_scan', 'available', 'rejected')),
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  scanned_at timestamptz,
  constraint documents_storage_path_matches_ids
    check (storage_path = company_id::text || '/' || id::text),
  constraint documents_scan_timestamps_consistent
    check (
      (scan_status in ('pending_upload', 'pending_scan') and scanned_at is null)
      or (scan_status in ('available', 'rejected') and scanned_at is not null)
    )
);

comment on table public.documents is
  'Métadonnées de pièces jointes. Le binaire reste dans un bucket privé ; les accès suivent les permissions du module parent.';
comment on column public.documents.scan_status is
  'pending_upload/pending_scan : aucun téléchargement autorisé ; available : contrôle de sécurité terminé ; rejected : fichier bloqué.';
comment on column public.documents.storage_path is
  'Chemin opaque company_id/document_id ; aucun nom de fichier fourni par le client n’est utilisé dans le chemin.';

create index documents_company_module_entity_idx
  on public.documents (company_id, module_code, entity_type, entity_id, created_at desc);
create index documents_created_by_idx
  on public.documents (created_by, created_at desc);
create index documents_pending_scan_idx
  on public.documents (created_at)
  where scan_status = 'pending_scan';

alter table public.documents enable row level security;
revoke all on table public.documents from public, anon, authenticated;
grant select on table public.documents to authenticated;
grant select, insert, update, delete on table public.documents to service_role;

create policy documents_select_by_parent_permission
  on public.documents
  for select
  to authenticated
  using (
    app.has_permission(company_id, module_code, 'read')
    or (
      created_by = (select auth.uid())
      and app.has_permission(company_id, module_code, 'create')
    )
  );

-- Contrôle générique du rattachement au parent. Les noms de tables sont issus
-- d'une liste fermée ; aucune valeur fournie par le client ne sert à construire
-- un identifiant SQL.
create or replace function app.document_entity_belongs_to_company(
  p_company_id uuid,
  p_module_code text,
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_table text;
  v_exists boolean := false;
begin
  if p_company_id is null or p_entity_id is null then
    return false;
  end if;

  if p_module_code = 'company' and p_entity_type = 'company' then
    return exists (
      select 1
      from public.companies c
      where c.id = p_company_id
        and c.id = p_entity_id
        and c.status = 'active'
    );
  end if;

  v_table := case
    when p_module_code = 'customers' and p_entity_type = 'customer' then 'customers'
    when p_module_code = 'suppliers' and p_entity_type = 'supplier' then 'suppliers'
    when p_module_code = 'invoices' and p_entity_type = 'invoice' then 'invoices'
    when p_module_code = 'payments' and p_entity_type = 'payment' then 'payments'
    when p_module_code = 'expenses' and p_entity_type = 'expense' then 'expenses'
    when p_module_code = 'treasury' and p_entity_type = 'cash_account' then 'cash_accounts'
    when p_module_code = 'budgets' and p_entity_type = 'budget' then 'budgets'
    when p_module_code = 'payroll' and p_entity_type = 'employee' then 'employees'
    when p_module_code = 'payroll' and p_entity_type = 'payslip' then 'payslips'
    when p_module_code = 'payroll' and p_entity_type = 'payroll_run' then 'payroll_runs'
    when p_module_code = 'members' and p_entity_type = 'membership' then 'company_memberships'
    when p_module_code = 'audit' and p_entity_type = 'audit_event' then 'audit_events'
    else null
  end;

  if v_table is null or to_regclass('public.' || v_table) is null then
    return false;
  end if;

  execute format(
    'select exists (select 1 from public.%I where id = $1 and company_id = $2)',
    v_table
  )
  into v_exists
  using p_entity_id, p_company_id;

  return coalesce(v_exists, false);
end;
$$;

revoke all on function app.document_entity_belongs_to_company(uuid, text, text, uuid)
  from public, anon, authenticated;

-- Cette RPC ne crée rien : elle permet au serveur de vérifier la permission
-- métier dans le contexte JWT de l'utilisateur avant toute opération service_role.
create or replace function public.can_upload_document(
  p_company_id uuid,
  p_module_code text,
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and app.has_permission(p_company_id, p_module_code, 'create')
    and app.document_entity_belongs_to_company(
      p_company_id, p_module_code, p_entity_type, p_entity_id
    );
$$;

revoke all on function public.can_upload_document(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.can_upload_document(uuid, text, text, uuid)
  to authenticated;

-- Finalisation réservée au serveur après que le binaire a été écrit et vérifié.
create or replace function public.complete_document_upload(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documents%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select d.*
    into v_doc
  from public.documents d
  where d.id = p_document_id
  for update;

  if not found or v_doc.scan_status <> 'pending_upload' then
    raise exception 'document upload not pending' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'company-private-documents'
      and o.name = v_doc.storage_path
  ) then
    raise exception 'document object missing' using errcode = 'P0002';
  end if;

  update public.documents
  set scan_status = 'pending_scan',
      uploaded_at = now()
  where id = p_document_id;

  insert into public.audit_events (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    v_doc.company_id,
    v_doc.created_by,
    'documents.uploaded',
    'document',
    v_doc.id,
    jsonb_build_object(
      'module', v_doc.module_code,
      'mime_type', v_doc.mime_type,
      'byte_size', v_doc.byte_size
    )
  );
end;
$$;

revoke all on function public.complete_document_upload(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_document_upload(uuid)
  to service_role;

-- Le worker antivirus devra appeler cette RPC après une analyse réelle.
-- Aucun fichier n'est disponible au téléchargement avant un résultat propre.
create or replace function public.complete_document_scan(
  p_document_id uuid,
  p_is_clean boolean,
  p_detected_mime text,
  p_actual_byte_size bigint,
  p_sha256 text,
  p_scanner_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documents%rowtype;
  v_status text;
  v_mime text;
  v_size bigint;
  v_hash text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_is_clean is null
     or p_scanner_code is null
     or p_scanner_code !~ '^[a-z0-9][a-z0-9._-]{1,63}$' then
    raise exception 'invalid scan result' using errcode = '22023';
  end if;

  if p_is_clean and (
    p_detected_mime is null
    or p_detected_mime not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
    or p_actual_byte_size is null
    or p_actual_byte_size not between 1 and 20971520
    or p_sha256 is null
    or p_sha256 !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'clean scan requires a supported format, actual size and SHA-256'
      using errcode = '22023';
  end if;

  select d.*
    into v_doc
  from public.documents d
  where d.id = p_document_id
  for update;

  if not found or v_doc.scan_status <> 'pending_scan' then
    raise exception 'document is not awaiting a scan' using errcode = 'P0002';
  end if;

  v_status := case when p_is_clean then 'available' else 'rejected' end;
  v_mime := case
    when p_detected_mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
      then p_detected_mime
    else v_doc.mime_type
  end;
  v_size := case
    when p_actual_byte_size between 1 and 20971520 then p_actual_byte_size
    else v_doc.byte_size
  end;
  v_hash := case
    when p_sha256 ~ '^[0-9a-f]{64}$' then p_sha256
    else v_doc.sha256
  end;

  update public.documents
  set scan_status = v_status,
      mime_type = v_mime,
      byte_size = v_size,
      sha256 = v_hash,
      scanned_at = now()
  where id = p_document_id;

  insert into public.audit_events (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    v_doc.company_id,
    null,
    'documents.scan_completed',
    'document',
    v_doc.id,
    jsonb_build_object(
      'result', v_status,
      'scanner', p_scanner_code,
      'detected_mime', v_mime,
      'byte_size', v_size
    )
  );
end;
$$;

revoke all on function public.complete_document_scan(uuid, boolean, text, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_document_scan(uuid, boolean, text, bigint, text, text)
  to service_role;

-- Les clients authentifiés ne peuvent ni créer, ni modifier, ni supprimer un objet.
-- L'upload utilise un jeton signé à usage unique généré côté serveur ; le binaire
-- ne transite pas par une fonction Vercel. Le bucket reste privé et seul un scanner
-- peut faire passer un document à l'état disponible.
alter table storage.objects enable row level security;

drop policy if exists company_private_documents_read on storage.objects;
create policy company_private_documents_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'company-private-documents'
    and exists (
      select 1
      from public.documents d
      where d.storage_path = storage.objects.name
        and d.scan_status = 'available'
        and app.has_permission(d.company_id, d.module_code, 'read')
    )
  );

commit;
