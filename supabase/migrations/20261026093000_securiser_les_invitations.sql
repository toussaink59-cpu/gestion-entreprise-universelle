-- Sécuriser les invitations par e-mail.
-- Retirer l'accès applicatif à l'ancien mécanisme d'invitation.
revoke all on function
  public.invite_existing_company_member(uuid, text, text)
  from public, anon, authenticated;

-- Exiger la confirmation pour réactiver une appartenance issue
-- du nouveau système d'invitation, même après une révocation.
-- Préserver la réactivation des anciennes appartenances révoquées
-- lorsqu'aucun enregistrement d'invitation par e-mail n'existe.
create or replace function app.guard_invitation_confirmation_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_accepted_at timestamptz;
begin
  if old.status is distinct from 'active'
     and new.status = 'active'
  then
    if not app.has_role(new.company_id, 'owner') then
      raise exception 'seul un propriétaire peut activer une appartenance'
        using errcode = '42501';
    end if;

    select it.accepted_at
      into v_accepted_at
    from public.company_invitation_tokens it
    where it.membership_id = old.id
      and it.company_id = old.company_id;

    if found then
      if v_accepted_at is null then
        raise exception 'le destinataire doit confirmer l’adresse e-mail avant l’activation'
          using errcode = 'P0001';
      end if;
    elsif old.status = 'invited' then
      raise exception 'le destinataire doit confirmer l’adresse e-mail avant l’activation'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function app.guard_invitation_confirmation_activation()
  from public, anon, authenticated;
