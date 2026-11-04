-- MVP: aucune limite fixe du nombre d'entreprises par propriétaire.
-- Les éventuels plafonds seront définis ultérieurement par formule d'abonnement,
-- après décision produit et implémentation d'une politique configurable.
--
-- Cette migration remplace la fonction introduite avec le plafond arbitraire
-- de cinq entreprises. Elle conserve les validations et contrôles d'accès.

create or replace function public.create_company(
  p_legal_name   text,
  p_trade_name   text default null,
  p_country_code text default 'BF',
  p_currency     text default 'XOF',
  p_timezone     text default 'Africa/Ouagadougou'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  -- 1. Vérifier l'authentification.
  if v_uid is null then
    raise exception 'authentification requise'
      using errcode = '28000';
  end if;

  -- 2. Vérifier que le compte utilisateur est actif.
  if not exists (
    select 1
    from public.users
    where id = v_uid
      and status = 'active'
  ) then
    raise exception 'compte inactif'
      using errcode = '42501';
  end if;

  -- 3. Valider la raison sociale.
  if p_legal_name is null
     or char_length(btrim(p_legal_name)) not between 2 and 200 then
    raise exception 'raison sociale invalide'
      using errcode = '22023';
  end if;

  -- 4. Valider le nom commercial lorsqu'il est renseigné.
  -- Une valeur composée uniquement d'espaces sera enregistrée comme NULL.
  if p_trade_name is not null
     and btrim(p_trade_name) <> ''
     and char_length(btrim(p_trade_name)) not between 2 and 200 then
    raise exception 'nom commercial invalide'
      using errcode = '22023';
  end if;

  -- 5. Créer l'entreprise avec des valeurs nettoyées.
  -- Aucun plafond fixe de création n'est appliqué au MVP.
  insert into public.companies (
    legal_name,
    trade_name,
    country_code,
    default_currency,
    timezone
  )
  values (
    btrim(p_legal_name),
    nullif(btrim(p_trade_name), ''),
    upper(btrim(p_country_code)),
    upper(btrim(p_currency)),
    p_timezone
  )
  returning id into v_id;

  -- 6. Attribuer automatiquement le rôle de propriétaire actif.
  insert into public.company_memberships (
    company_id,
    user_id,
    role_code,
    status
  )
  values (
    v_id,
    v_uid,
    'owner',
    'active'
  );

  return v_id;
end;
$$;

-- Conserver les droits d'exécution minimaux de la fonction.
revoke all on function public.create_company(text, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.create_company(text, text, text, text, text)
  to authenticated;
