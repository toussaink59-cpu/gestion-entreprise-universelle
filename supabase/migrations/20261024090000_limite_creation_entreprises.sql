-- Anti-abus : un utilisateur ne peut pas créer un nombre illimité d'entreprises.
-- Limite : 5 entreprises dont il est propriétaire actif (à ajuster par une nouvelle migration).
-- Un verrou par utilisateur évite de dépasser la limite avec deux appels simultanés.

create or replace function public.create_company(
  p_legal_name   text,
  p_trade_name   text default null,
  p_country_code text default 'BF',
  p_currency     text default 'XOF',
  p_timezone     text default 'Africa/Ouagadougou'
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_id    uuid;
  v_count integer;
  c_max   constant integer := 5;
begin
  if v_uid is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if not exists (select 1 from public.users where id = v_uid and status = 'active') then
    raise exception 'compte inactif' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('create_company:' || v_uid::text, 0));

  select count(*) into v_count
  from public.company_memberships m
  where m.user_id = v_uid and m.role_code = 'owner' and m.status = 'active';

  if v_count >= c_max then
    raise exception 'limite du nombre d''entreprises atteinte' using errcode = '54000';
  end if;

  insert into public.companies (legal_name, trade_name, country_code, default_currency, timezone)
  values (p_legal_name, p_trade_name, upper(p_country_code), upper(p_currency), p_timezone)
  returning id into v_id;

  insert into public.company_memberships (company_id, user_id, role_code, status)
  values (v_id, v_uid, 'owner', 'active');

  return v_id;
end;
$$;

revoke all on function public.create_company(text, text, text, text, text) from public, anon;
grant execute on function public.create_company(text, text, text, text, text) to authenticated;
