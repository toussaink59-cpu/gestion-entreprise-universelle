-- Phase 2A — transmission des devis (brouillon -> transmis).
-- Numérotation PROVISOIRE et INTERNE aux devis : D-AAAA-NNNN, par entreprise et par année
-- (année du fuseau de l'entreprise). Ce n'est pas une série légale : la numérotation des
-- factures reste à définir avec un professionnel compétent. Aucun taux de taxe n'est présumé.
-- Un numéro n'est jamais réattribué : le compteur n'avance que dans la transaction qui
-- transmet réellement le devis, et il n'est pas décrémenté.

-- ---------------------------------------------------------------------------
-- Compteur : aucun accès direct (RLS activée, aucune politique, aucun droit)
-- ---------------------------------------------------------------------------
create table public.quote_number_counters (
  company_id uuid not null references public.companies(id) on delete restrict,
  numbering_year integer not null check (numbering_year between 2000 and 2100),
  last_value integer not null check (last_value > 0),
  primary key (company_id, numbering_year)
);

comment on table public.quote_number_counters is
  'Compteurs de numérotation provisoire des devis. Écrit uniquement par send_quote().';

alter table public.quote_number_counters enable row level security;
revoke all on table public.quote_number_counters from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Devis : qui a transmis, et garde de cohérence des devis non brouillons
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column sent_by uuid references public.users(id) on delete set null;

alter table public.quotes
  add constraint quotes_number_format_check
  check (quote_number is null or quote_number ~ '^D-[0-9]{4}-[0-9]{4,}$');

alter table public.quotes
  add constraint quotes_non_draft_complete_check
  check (
    status = 'draft'
    or (
      quote_number is not null
      and sent_at is not null
      and customer_snapshot is not null
      and issuer_snapshot is not null
    )
  );

-- ---------------------------------------------------------------------------
-- Transmission : numéro, photographie du client et de l'émetteur, statut, audit
-- ---------------------------------------------------------------------------
create function public.send_quote(
  p_company_id uuid,
  p_quote_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_quote public.quotes%rowtype;
  v_company public.companies%rowtype;
  v_customer public.customers%rowtype;
  v_year integer;
  v_value integer;
  v_number text;
  v_line_count integer;
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if p_company_id is null or p_quote_id is null then
    raise exception 'Entreprise et devis requis' using errcode = '22023';
  end if;

  if not app.has_permission(p_company_id, 'quotes', 'validate') then
    raise exception 'Permission de transmission de devis refusée' using errcode = '42501';
  end if;

  select * into v_company
  from public.companies c
  where c.id = p_company_id and c.status = 'active';

  if not found then
    raise exception 'Entreprise active introuvable' using errcode = '42501';
  end if;

  select * into v_quote
  from public.quotes q
  where q.id = p_quote_id and q.company_id = p_company_id
  for update;

  if not found then
    raise exception 'Devis introuvable' using errcode = '42501';
  end if;

  if v_quote.status <> 'draft' then
    raise exception 'Seul un brouillon peut être transmis' using errcode = '55000';
  end if;

  select count(*) into v_line_count
  from public.quote_lines l
  where l.quote_id = v_quote.id and l.company_id = p_company_id;

  if v_line_count = 0 then
    raise exception 'Le devis doit contenir au moins une ligne' using errcode = '22023';
  end if;

  if v_quote.valid_until < (now() at time zone v_company.timezone)::date then
    raise exception 'La date de validité du devis est dépassée' using errcode = '22023';
  end if;

  select * into v_customer
  from public.customers c
  where c.id = v_quote.customer_id
    and c.company_id = p_company_id
    and c.status = 'active'
  for share;

  if not found then
    raise exception 'Client actif introuvable dans cette entreprise' using errcode = '22023';
  end if;

  v_year := extract(year from (now() at time zone v_company.timezone))::integer;

  insert into public.quote_number_counters as c (company_id, numbering_year, last_value)
  values (p_company_id, v_year, 1)
  on conflict (company_id, numbering_year)
  do update set last_value = c.last_value + 1
  returning c.last_value into v_value;

  v_number := 'D-' || v_year::text || '-' || lpad(v_value::text, 4, '0');

  update public.quotes
  set status = 'sent',
      quote_number = v_number,
      sent_at = now(),
      sent_by = v_actor,
      customer_snapshot = jsonb_build_object(
        'id', v_customer.id,
        'name', v_customer.name,
        'contact_name', v_customer.contact_name,
        'email', v_customer.email,
        'phone', v_customer.phone,
        'tax_identifier', v_customer.tax_identifier,
        'address', v_customer.address,
        'city', v_customer.city,
        'country_code', v_customer.country_code
      ),
      issuer_snapshot = jsonb_build_object(
        'company_id', v_company.id,
        'legal_name', v_company.legal_name,
        'trade_name', v_company.trade_name,
        'country_code', v_company.country_code,
        'currency_code', v_company.default_currency,
        'fiscal_profile_status', 'not_configured'
      ),
      updated_by = v_actor,
      updated_at = now()
  where id = v_quote.id and company_id = p_company_id;

  perform app.log_event(
    p_company_id,
    'quotes.sent',
    'quotes',
    v_quote.id,
    jsonb_build_object(
      'quote_number', v_number,
      'total_amount', v_quote.total_amount,
      'line_count', v_line_count
    )
  );

  return v_number;
end;
$$;

revoke all on function public.send_quote(uuid, uuid) from public, anon, authenticated;
grant execute on function public.send_quote(uuid, uuid) to authenticated;
