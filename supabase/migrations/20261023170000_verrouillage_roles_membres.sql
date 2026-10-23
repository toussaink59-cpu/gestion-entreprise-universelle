-- Durcir l'attribution des rôles privilégiés aux membres d'une entreprise.
-- Un propriétaire est le seul à pouvoir attribuer owner ou company_admin.
-- Cette migration corrige les chemins RPC, INSERT direct et UPDATE de rôle.

create or replace function app.guard_membership_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_initial_owner boolean := false;
begin
  if tg_op = 'INSERT' then
    if v_actor is null then
      raise exception 'authentification requise'
        using errcode = '28000';
    end if;

    -- Le compte créateur devient propriétaire lors de create_company().
    -- Cette exception ne s'applique qu'à la première appartenance
    -- du créateur à la nouvelle entreprise.
    if new.user_id = v_actor
       and new.role_code = 'owner'
       and new.status = 'active'
       and not exists (
         select 1
         from public.company_memberships m
         where m.company_id = new.company_id
       )
    then
      v_initial_owner := true;
    end if;

    -- Refuser les tentatives explicites de falsification de l'invitant.
    if new.invited_by is not null then
      raise exception 'invited_by est défini par le serveur'
        using errcode = '42501';
    end if;

    -- La création initiale du propriétaire reste autorisée.
    if v_initial_owner then
      new.invited_by := null;
      return new;
    end if;

    -- Aucun rôle privilégié ne peut être attribué directement par un admin.
    if new.role_code in ('owner', 'company_admin')
       and not app.has_role(new.company_id, 'owner')
    then
      raise exception 'seul le propriétaire peut attribuer ce rôle'
        using errcode = '42501';
    end if;

    -- L'invitant est déterminé à partir de la session authentifiée.
    new.invited_by := v_actor;

    -- Un administrateur peut créer une invitation, mais seul le
    -- propriétaire peut créer directement une appartenance active.
    if new.status = 'active'
       and new.role_code <> 'owner'
       and app.has_permission(new.company_id, 'members', 'create')
       and not app.has_role(new.company_id, 'owner')
    then
      raise exception 'seul un propriétaire peut activer directement une appartenance'
        using errcode = '42501';
    end if;

    if new.status = 'revoked' then
      raise exception 'une appartenance révoquée ne peut pas être créée directement'
        using errcode = '42501';
    end if;

    return new;
  end if;

  -- Une fois créée, l'identité de l'invitant est immuable, sauf NULL
  -- automatique provoqué par la suppression du compte invitant.
  if new.invited_by is distinct from old.invited_by then
    if not (
      old.invited_by is not null
      and new.invited_by is null
      and not exists (
        select 1
        from public.users u
        where u.id = old.invited_by
      )
    ) then
      raise exception 'invited_by ne peut pas être modifié'
        using errcode = '42501';
    end if;
  end if;

  -- Empêcher la promotion vers un rôle privilégié par un non-propriétaire.
  if new.role_code is distinct from old.role_code
     and new.role_code in ('owner', 'company_admin')
     and not app.has_role(new.company_id, 'owner')
  then
    raise exception 'seul le propriétaire peut attribuer ce rôle'
      using errcode = '42501';
  end if;

  -- Toute transition vers active depuis un autre statut exige un propriétaire.
  if old.status is distinct from 'active'
     and new.status = 'active'
     and not app.has_role(new.company_id, 'owner')
  then
    raise exception 'seul un propriétaire peut activer une appartenance'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function app.guard_membership_write()
  from public, anon, authenticated;

-- Le RPC rejette explicitement les rôles privilégiés avant l'insertion.
create or replace function public.invite_existing_company_member(
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

  if p_role_code in ('owner', 'company_admin')
     and not app.has_role(p_company_id, 'owner')
  then
    raise exception 'seul le propriétaire peut attribuer ce rôle'
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

revoke all on function public.invite_existing_company_member(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.invite_existing_company_member(uuid, text, text)
  to authenticated;
