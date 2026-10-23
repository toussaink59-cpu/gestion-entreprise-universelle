-- Protection des appartenances : invited_by et activation des membres.
-- À valider exclusivement sur une base locale ou jetable avant toute utilisation hébergée.

-- 1. Le client ne doit pas pouvoir choisir l'identité de l'invitant.
revoke insert (invited_by)
  on public.company_memberships
  from authenticated;

-- 2. Contrôles serveur sur la création et la modification des appartenances.
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

    -- Refuser toute tentative explicite de falsification.
    -- Les clients normaux ne disposent plus du privilège INSERT sur
    -- cette colonne ; ce contrôle protège aussi les autres chemins SQL.
    if new.invited_by is not null then
      raise exception 'invited_by est défini par le serveur'
        using errcode = '42501';
    end if;

    if v_initial_owner then
      new.invited_by := null;
      return new;
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

  -- Une fois créée, l'identité de l'invitant est immuable.
  if new.invited_by is distinct from old.invited_by then
    raise exception 'invited_by ne peut pas être modifié'
      using errcode = '42501';
  end if;

  -- Toute transition vers active depuis un autre statut nécessite
  -- le rôle propriétaire. Les modifications ordinaires d'une
  -- appartenance déjà active restent soumises à la RLS existante.
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

drop trigger if exists memberships_guard_write
  on public.company_memberships;

create trigger memberships_guard_write
  before insert or update on public.company_memberships
  for each row
  execute function app.guard_membership_write();
