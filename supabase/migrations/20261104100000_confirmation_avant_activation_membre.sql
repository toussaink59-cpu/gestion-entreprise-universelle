-- Exiger le parcours d'invitation et la confirmation d'adresse avant toute
-- nouvelle appartenance active. Seule la création atomique du premier propriétaire
-- via create_company() reste autorisée à insérer directement un statut active.

create or replace function app.guard_active_membership_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if new.status is distinct from 'active' then
    return new;
  end if;

  -- Exception strictement limitée au propriétaire initial créé par create_company().
  if v_actor is not null
     and new.user_id = v_actor
     and new.role_code = 'owner'
     and not exists (
       select 1
       from public.company_memberships m
       where m.company_id = new.company_id
     )
  then
    return new;
  end if;

  if new.role_code in ('owner', 'company_admin')
     and not app.has_role(new.company_id, 'owner')
  then
    raise exception 'seul le propriétaire peut attribuer ce rôle'
      using errcode = '42501';
  end if;

  if not app.has_permission(new.company_id, 'members', 'create') then
    raise exception 'permission denied: permission members:create requise'
      using errcode = '42501';
  end if;

  if not app.has_role(new.company_id, 'owner') then
    raise exception 'seul un propriétaire peut créer directement une appartenance active'
      using errcode = '42501';
  end if;

  raise exception 'une nouvelle appartenance active doit passer par une invitation et la confirmation d’adresse e-mail'
    using errcode = '42501';
end;
$$;

revoke all on function app.guard_active_membership_insert()
  from public, anon, authenticated;

drop trigger if exists company_membership_active_insert_guard
  on public.company_memberships;

create trigger company_membership_active_insert_guard
  before insert on public.company_memberships
  for each row
  execute function app.guard_active_membership_insert();

-- Les clients applicatifs ne créent jamais directement une appartenance :
-- toutes les invitations doivent passer par la RPC qui crée atomiquement
-- l'appartenance et son jeton à usage unique. Cela évite les invitations
-- orphelines qui bloqueraient une nouvelle invitation via l'unicité company/user.
revoke insert on table public.company_memberships from public, anon, authenticated;
revoke insert (company_id, user_id, role_code, status, invited_by)
  on public.company_memberships
  from authenticated;
drop policy if exists memberships_insert on public.company_memberships;
