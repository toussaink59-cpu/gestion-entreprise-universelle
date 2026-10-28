-- Invitations par e-mail avec jeton opaque à usage unique.
-- Le destinataire confirme son adresse ; l’activation de l’accès reste réservée au propriétaire.

create table public.company_invitation_tokens (
  membership_id uuid primary key references public.company_memberships(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null check (email = lower(btrim(email))),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  email_sent_at timestamptz,
  provider_message_id text,
  last_attempt_at timestamptz not null default now()
);

alter table public.company_invitation_tokens enable row level security;
revoke all on table public.company_invitation_tokens from public, anon, authenticated;

create or replace function public.create_company_member_invitation(
  p_company_id uuid,
  p_email text,
  p_role_code text,
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid;
  v_target_email text;
  v_membership_id uuid;
begin
  if v_actor is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if p_company_id is null or not app.has_permission(p_company_id, 'members', 'create') then
    raise exception 'permission de gestion des membres requise' using errcode = '42501';
  end if;
  if p_email is null or length(btrim(p_email)) > 254
     or btrim(p_email) = '' or btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'adresse e-mail invalide' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'jeton d’invitation invalide' using errcode = '22023';
  end if;
  if p_role_code is null or not exists (select 1 from public.roles r where r.code = p_role_code) then
    raise exception 'rôle invalide' using errcode = '22023';
  end if;
  if p_role_code in ('owner', 'company_admin') and not app.has_role(p_company_id, 'owner') then
    raise exception 'seul le propriétaire peut attribuer ce rôle' using errcode = '42501';
  end if;

  select au.id, lower(au.email)
    into v_target, v_target_email
  from auth.users au
  join public.users u on u.id = au.id and u.status = 'active'
  where lower(au.email) = lower(btrim(p_email))
  limit 1;
  if v_target is null then
    raise exception 'aucun compte actif correspondant à cette adresse' using errcode = 'P0002';
  end if;
  if v_target = v_actor then
    raise exception 'impossible de s’inviter soi-même' using errcode = '42501';
  end if;
  if exists (select 1 from public.company_memberships m where m.company_id = p_company_id and m.user_id = v_target) then
    raise exception 'ce compte possède déjà une appartenance à cette entreprise' using errcode = '23505';
  end if;

  insert into public.company_memberships (company_id, user_id, role_code, status)
  values (p_company_id, v_target, p_role_code, 'invited')
  returning id into v_membership_id;

  insert into public.company_invitation_tokens
    (membership_id, company_id, email, token_hash, created_by, expires_at, last_attempt_at)
  values
    (v_membership_id, p_company_id, v_target_email, p_token_hash, v_actor, now() + interval '7 days', now());

  return v_membership_id;
end;
$$;

revoke all on function public.create_company_member_invitation(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_company_member_invitation(uuid, text, text, text) to authenticated;

create or replace function public.prepare_company_member_invitation_resend(
  p_company_id uuid,
  p_membership_id uuid,
  p_token_hash text
)
returns table (invite_email text, role_code text, company_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_invited_by uuid;
  v_role_code text;
  v_status text;
  v_email text;
  v_company_name text;
  v_accepted_at timestamptz;
  v_last_attempt_at timestamptz;
  v_has_token boolean := false;
begin
  if v_actor is null then raise exception 'authentification requise' using errcode = '28000'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'jeton d’invitation invalide' using errcode = '22023';
  end if;
  if p_company_id is null or not app.has_permission(p_company_id, 'members', 'create') then
    raise exception 'permission de gestion des membres requise' using errcode = '42501';
  end if;

  select m.invited_by, m.role_code, m.status, lower(au.email),
         coalesce(c.trade_name, c.legal_name), it.accepted_at, it.last_attempt_at,
         (it.membership_id is not null)
    into v_invited_by, v_role_code, v_status, v_email, v_company_name,
         v_accepted_at, v_last_attempt_at, v_has_token
  from public.company_memberships m
  join auth.users au on au.id = m.user_id
  join public.users u on u.id = m.user_id and u.status = 'active'
  join public.companies c on c.id = m.company_id and c.status = 'active'
  left join public.company_invitation_tokens it on it.membership_id = m.id
  where m.id = p_membership_id and m.company_id = p_company_id
  for update of m;

  if not found or v_status <> 'invited' then
    raise exception 'cette invitation n’est plus en attente' using errcode = 'P0002';
  end if;
  if not app.has_role(p_company_id, 'owner') and v_invited_by is distinct from v_actor then
    raise exception 'seul le propriétaire ou l’invitant autorisé peut renvoyer cet e-mail' using errcode = '42501';
  end if;
  if v_accepted_at is not null then
    raise exception 'le destinataire a déjà confirmé cette invitation' using errcode = '23505';
  end if;
  if v_last_attempt_at is not null and v_last_attempt_at > now() - interval '60 seconds' then
    raise exception 'attends une minute avant le prochain envoi' using errcode = 'P0001';
  end if;

  if v_has_token then
    update public.company_invitation_tokens
      set email = v_email,
          token_hash = p_token_hash,
          expires_at = now() + interval '7 days',
          accepted_at = null,
          email_sent_at = null,
          provider_message_id = null,
          last_attempt_at = now()
    where membership_id = p_membership_id;
  else
    insert into public.company_invitation_tokens
      (membership_id, company_id, email, token_hash, created_by, expires_at, last_attempt_at)
    values
      (p_membership_id, p_company_id, v_email, p_token_hash, v_actor, now() + interval '7 days', now());
  end if;

  return query select v_email, v_role_code, v_company_name;
end;
$$;

revoke all on function public.prepare_company_member_invitation_resend(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_company_member_invitation_resend(uuid, uuid, text) to authenticated;

create or replace function public.mark_company_member_invitation_email_sent(
  p_membership_id uuid,
  p_token_hash text,
  p_provider_message_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_company_id uuid;
  v_invited_by uuid;
  v_status text;
begin
  if v_actor is null then raise exception 'authentification requise' using errcode = '28000'; end if;
  select m.company_id, m.invited_by, m.status into v_company_id, v_invited_by, v_status
  from public.company_memberships m where m.id = p_membership_id;
  if not found or v_status <> 'invited' then raise exception 'invitation introuvable' using errcode = 'P0002'; end if;
  if not app.has_permission(v_company_id, 'members', 'create')
     or (not app.has_role(v_company_id, 'owner') and v_invited_by is distinct from v_actor) then
    raise exception 'permission de gestion des membres requise' using errcode = '42501';
  end if;
  if p_provider_message_id is null or length(p_provider_message_id) < 1 or length(p_provider_message_id) > 200 then
    raise exception 'identifiant du fournisseur e-mail invalide' using errcode = '22023';
  end if;
  update public.company_invitation_tokens
    set email_sent_at = now(), provider_message_id = p_provider_message_id
  where membership_id = p_membership_id and token_hash = p_token_hash
    and accepted_at is null and expires_at > now();
  if not found then raise exception 'le jeton a changé ou a expiré' using errcode = 'P0002'; end if;
end;
$$;

revoke all on function public.mark_company_member_invitation_email_sent(uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_company_member_invitation_email_sent(uuid, text, text) to authenticated;

create or replace function public.confirm_company_member_invitation(p_token_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_membership_id uuid;
  v_email text;
  v_expires_at timestamptz;
  v_accepted_at timestamptz;
  v_membership_status text;
  v_user_email text;
  v_user_status text;
begin
  if v_actor is null then raise exception 'authentification requise' using errcode = '28000'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'lien d’invitation invalide' using errcode = '22023';
  end if;
  select it.membership_id, it.email, it.expires_at, it.accepted_at, m.status
    into v_membership_id, v_email, v_expires_at, v_accepted_at, v_membership_status
  from public.company_invitation_tokens it
  join public.company_memberships m on m.id = it.membership_id and m.company_id = it.company_id
  where it.token_hash = p_token_hash
  for update of it, m;
  if not found or v_membership_status <> 'invited' then
    raise exception 'lien d’invitation invalide ou expiré' using errcode = 'P0002';
  end if;
  if v_expires_at <= now() then raise exception 'lien d’invitation expiré' using errcode = 'P0002'; end if;
  if v_accepted_at is not null then raise exception 'ce lien a déjà été utilisé' using errcode = '23505'; end if;

  select lower(au.email), u.status into v_user_email, v_user_status
  from auth.users au join public.users u on u.id = au.id
  where au.id = v_actor;
  if v_user_email is null or v_user_status <> 'active' or v_user_email <> lower(v_email) then
    raise exception 'cette invitation ne correspond pas à l’adresse e-mail de ce compte' using errcode = '42501';
  end if;

  update public.company_invitation_tokens set accepted_at = now()
  where membership_id = v_membership_id and accepted_at is null;
  if not found then raise exception 'ce lien a déjà été utilisé' using errcode = '23505'; end if;
  -- La confirmation ne donne pas encore accès à l’entreprise : un propriétaire active le membre après vérification.
end;
$$;

revoke all on function public.confirm_company_member_invitation(text) from public, anon, authenticated;
grant execute on function public.confirm_company_member_invitation(text) to authenticated;

create or replace function public.list_company_invitation_metadata(p_company_id uuid)
returns table (
  membership_id uuid,
  email_sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then raise exception 'authentification requise' using errcode = '28000'; end if;
  if p_company_id is null or not app.has_permission(p_company_id, 'members', 'read') then
    raise exception 'accès refusé aux invitations' using errcode = '42501';
  end if;
  return query
    select m.id, it.email_sent_at, it.accepted_at, it.expires_at
    from public.company_memberships m
    left join public.company_invitation_tokens it on it.membership_id = m.id
    where m.company_id = p_company_id;
end;
$$;

revoke all on function public.list_company_invitation_metadata(uuid) from public, anon, authenticated;
grant execute on function public.list_company_invitation_metadata(uuid) to authenticated;
-- Une confirmation d’adresse est obligatoire avant l’activation d’une invitation.
-- Cette règle est appliquée en base, y compris aux UPDATE directs hors de l’interface.
create or replace function app.guard_invitation_confirmation_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_accepted_at timestamptz;
begin
  if old.status = 'invited' and new.status = 'active' then
    if not app.has_role(new.company_id, 'owner') then
      raise exception 'seul un propriétaire peut activer une appartenance'
        using errcode = '42501';
    end if;
    select it.accepted_at
      into v_accepted_at
    from public.company_invitation_tokens it
    where it.membership_id = old.id
      and it.company_id = old.company_id;

    if not found or v_accepted_at is null then
      raise exception 'le destinataire doit confirmer l’adresse e-mail avant l’activation'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function app.guard_invitation_confirmation_activation()
  from public, anon, authenticated;

drop trigger if exists company_membership_invitation_confirmation_guard
  on public.company_memberships;

create trigger company_membership_invitation_confirmation_guard
  before update of status on public.company_memberships
  for each row
  execute function app.guard_invitation_confirmation_activation();
