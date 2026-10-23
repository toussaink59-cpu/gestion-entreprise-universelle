-- Gestion sécurisée des membres : consultation et invitation de comptes existants.
-- Cette migration doit être testée localement avant tout déploiement.

-- 1. Lister les membres d'une entreprise uniquement pour les acteurs autorisés.
create function public.list_company_members(p_company_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  email text,
  full_name text,
  role_code text,
  status text,
  invited_by uuid,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'authentification requise'
      using errcode = '28000';
  end if;

  if p_company_id is null
     or not app.has_permission(p_company_id, 'members', 'read')
  then
    raise exception 'accès refusé à la liste des membres'
      using errcode = '42501';
  end if;

  return query
    select
      m.id,
      m.user_id,
      au.email::text,
      u.full_name::text,
      m.role_code::text,
      m.status::text,
      m.invited_by,
      m.created_at
    from public.company_memberships m
    join public.users u on u.id = m.user_id
    left join auth.users au on au.id = m.user_id
    where m.company_id = p_company_id
    order by m.created_at desc, m.id;
end;
$$;

-- 2. Inviter un compte déjà créé, sans exposer auth.users à l'interface.
create function public.invite_existing_company_member(
  p_company_id uuid,
  p_email text,
  p_role_code text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid;
  v_membership_id uuid;
begin
  if v_actor is null then
    raise exception 'authentification requise'
      using errcode = '28000';
  end if;

  if p_company_id is null
     or not app.has_permission(p_company_id, 'members', 'create')
  then
    raise exception 'permission de gestion des membres requise'
      using errcode = '42501';
  end if;

  if p_email is null or btrim(p_email) = '' then
    raise exception 'adresse e-mail obligatoire'
      using errcode = '22023';
  end if;

  if p_role_code is null
     or not exists (
       select 1 from public.roles r where r.code = p_role_code
     )
  then
    raise exception 'rôle invalide'
      using errcode = '22023';
  end if;

  if p_role_code = 'owner'
     and not app.has_role(p_company_id, 'owner')
  then
    raise exception 'seul le propriétaire peut attribuer le rôle propriétaire'
      using errcode = '42501';
  end if;

  select au.id
    into v_target
  from auth.users au
  join public.users u on u.id = au.id
  where lower(au.email) = lower(btrim(p_email))
    and u.status = 'active'
  limit 1;

  if v_target is null then
    raise exception 'aucun compte actif correspondant à cette adresse'
      using errcode = 'P0002';
  end if;

  if v_target = v_actor then
    raise exception 'impossible de s''inviter soi-même'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.company_memberships m
    where m.company_id = p_company_id
      and m.user_id = v_target
  ) then
    raise exception 'ce compte possède déjà une appartenance à cette entreprise'
      using errcode = '23505';
  end if;

  insert into public.company_memberships
    (company_id, user_id, role_code, status)
  values
    (p_company_id, v_target, p_role_code, 'invited')
  returning id into v_membership_id;

  -- Le déclencheur memberships_guard_write renseigne invited_by
  -- à partir de la session authentifiée.

  return v_membership_id;
end;
$$;

-- Ne pas laisser les fonctions exécutables par les visiteurs anonymes.
revoke all on function public.list_company_members(uuid)
  from public, anon, authenticated;
grant execute on function public.list_company_members(uuid)
  to authenticated;

revoke all on function public.invite_existing_company_member(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.invite_existing_company_member(uuid, text, text)
  to authenticated;