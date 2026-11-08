-- Phase 2A — fondation des devis brouillons.
-- Aucun numéro, snapshot fiscal, taux de taxe ou document émis n'est créé ici.
-- Les devis restent des brouillons jusqu'à la validation des règles de transmission.

-- ---------------------------------------------------------------------------
-- Permissions : matrice validée le 4 novembre 2026
-- ---------------------------------------------------------------------------

insert into public.permissions (module, action)
select 'quotes', action
from unnest(array['read', 'create', 'update', 'validate', 'cancel', 'export']) as action
on conflict (module, action) do nothing;

insert into public.role_permissions (role_code, module, action)
select roles.role_code, 'quotes', permissions.action
from (values ('owner'), ('company_admin')) as roles(role_code)
cross join unnest(array['read', 'create', 'update', 'validate', 'cancel', 'export']) as permissions(action)
on conflict (role_code, module, action) do nothing;

insert into public.role_permissions (role_code, module, action)
values
  ('finance', 'quotes', 'read'),
  ('finance', 'quotes', 'export'),
  ('sales_purchasing', 'quotes', 'read'),
  ('sales_purchasing', 'quotes', 'create'),
  ('sales_purchasing', 'quotes', 'update'),
  ('sales_purchasing', 'quotes', 'validate'),
  ('auditor', 'quotes', 'read'),
  ('auditor', 'quotes', 'export')
on conflict (role_code, module, action) do nothing;

-- Le commercial consulte les factures mais ne les crée, ne les modifie,
-- n'émet ni ne les annule. La finance ne peut pas annuler une facture émise
-- par un simple changement de statut : une procédure de correction distincte
-- devra être conçue après validation réglementaire.
delete from public.role_permissions
where role_code = 'sales_purchasing'
  and module = 'invoices'
  and action in ('create', 'update', 'validate', 'cancel');

delete from public.role_permissions
where role_code = 'finance'
  and module = 'invoices'
  and action = 'cancel';

-- ---------------------------------------------------------------------------
-- Intégrité référentielle multi-entreprises
-- ---------------------------------------------------------------------------

alter table public.customers
  add constraint customers_company_id_id_key unique (company_id, id);

-- ---------------------------------------------------------------------------
-- Tables métier
-- ---------------------------------------------------------------------------

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  customer_id uuid not null,
  quote_number text,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'cancelled')),
  issue_date date not null default current_date,
  valid_until date not null,
  currency_code char(3) not null,
  subject text check (subject is null or length(subject) <= 200),
  customer_snapshot jsonb,
  issuer_snapshot jsonb,
  terms text check (terms is null or length(terms) <= 5000),
  notes text check (notes is null or length(notes) <= 5000),
  subtotal_amount numeric(20,4) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(20,4) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(20,4) not null default 0 check (tax_amount = 0),
  total_amount numeric(20,4) not null default 0 check (total_amount >= 0),
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references public.users(id) on delete set null,
  acceptance_method text,
  acceptance_reference text,
  rejected_at timestamptz,
  rejected_by uuid references public.users(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references public.users(id) on delete set null,
  cancellation_reason text,
  created_by uuid not null default auth.uid() references public.users(id) on delete restrict,
  updated_by uuid not null default auth.uid() references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, quote_number),
  foreign key (company_id, customer_id)
    references public.customers(company_id, id) on delete restrict,
  check (valid_until >= issue_date),
  check (currency_code ~ '^[A-Z]{3}$'),
  check (discount_amount <= subtotal_amount),
  check (total_amount = subtotal_amount - discount_amount),
  check (
    (status = 'draft' and sent_at is null and customer_snapshot is null and issuer_snapshot is null)
    or status <> 'draft'
  )
);

comment on table public.quotes is
  'Devis commerciaux par entreprise. Cette première tranche ne gère que les brouillons ; aucun document transmis ou numéro officiel ne peut être créé par l’API.';

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  quote_id uuid not null,
  position integer not null check (position > 0),
  description text not null check (description = btrim(description) and length(description) between 1 and 500),
  quantity numeric(18,4) not null check (quantity > 0),
  unit_label text not null check (unit_label = btrim(unit_label) and length(unit_label) between 1 and 40),
  unit_price numeric(20,4) not null check (unit_price >= 0),
  discount_type text not null default 'none'
    check (discount_type in ('none', 'percentage', 'fixed')),
  discount_value numeric(20,4) not null default 0 check (discount_value >= 0),
  tax_label text,
  tax_rate numeric(9,6),
  base_amount numeric(20,4) not null check (base_amount >= 0),
  discount_amount numeric(20,4) not null check (discount_amount >= 0),
  taxable_amount numeric(20,4) not null check (taxable_amount >= 0),
  tax_amount numeric(20,4) not null default 0 check (tax_amount = 0),
  total_amount numeric(20,4) not null check (total_amount >= 0),
  created_at timestamptz not null default now(),
  unique (company_id, quote_id, id),
  unique (company_id, quote_id, position),
  foreign key (company_id, quote_id)
    references public.quotes(company_id, id) on delete restrict,
  check (discount_amount <= base_amount),
  check (taxable_amount = base_amount - discount_amount),
  check (total_amount = taxable_amount),
  check (tax_rate is null and tax_label is null)
);

comment on table public.quote_lines is
  'Lignes de devis brouillon. Les taxes ne sont volontairement pas calculées dans cette tranche, en attente de validation fiscale.';

create index quotes_company_status_date_idx
  on public.quotes(company_id, status, issue_date desc);
create index quotes_company_customer_date_idx
  on public.quotes(company_id, customer_id, issue_date desc);
create index quote_lines_company_quote_position_idx
  on public.quote_lines(company_id, quote_id, position);

-- ---------------------------------------------------------------------------
-- Accès : lecture RLS ; toutes les écritures passent par save_quote_draft.
-- Aucun droit de suppression n'est accordé.
-- ---------------------------------------------------------------------------

alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;

revoke all on table public.quotes, public.quote_lines from public, anon, authenticated;
grant select on table public.quotes, public.quote_lines to authenticated;

create policy quotes_select
  on public.quotes for select to authenticated
  using (app.has_permission(company_id, 'quotes', 'read'));

create policy quote_lines_select
  on public.quote_lines for select to authenticated
  using (
    exists (
      select 1
      from public.quotes q
      where q.id = quote_lines.quote_id
        and q.company_id = quote_lines.company_id
        and app.has_permission(q.company_id, 'quotes', 'read')
    )
  );

-- ---------------------------------------------------------------------------
-- Écriture transactionnelle des brouillons et calcul des montants côté serveur.
-- Les valeurs fiscales sont exclues : aucun taux n'est présumé.
-- ---------------------------------------------------------------------------

create function public.save_quote_draft(
  p_company_id uuid,
  p_customer_id uuid,
  p_lines jsonb,
  p_issue_date date,
  p_valid_until date,
  p_quote_id uuid default null,
  p_subject text default null,
  p_terms text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_quote_id uuid;
  v_currency char(3);
  v_valid_until date := p_valid_until;
  v_item jsonb;
  v_position integer := 0;
  v_description text;
  v_unit_label text;
  v_quantity numeric(18,4);
  v_unit_price numeric(20,4);
  v_discount_type text;
  v_discount_value numeric(20,4);
  v_base numeric(20,4);
  v_discount numeric(20,4);
  v_taxable numeric(20,4);
  v_subtotal numeric(20,4) := 0;
  v_discount_total numeric(20,4) := 0;
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if p_company_id is null or p_customer_id is null then
    raise exception 'Entreprise et client requis' using errcode = '22023';
  end if;

  if p_issue_date is null or v_valid_until is null or v_valid_until < p_issue_date then
    raise exception 'Les dates du devis sont obligatoires et la validité doit être cohérente' using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) not between 1 and 100 then
    raise exception 'Le devis doit contenir entre 1 et 100 lignes' using errcode = '22023';
  end if;

  if p_subject is not null and length(p_subject) > 200
     or p_terms is not null and length(p_terms) > 5000
     or p_notes is not null and length(p_notes) > 5000 then
    raise exception 'Un champ texte dépasse la longueur autorisée' using errcode = '22023';
  end if;

  if p_quote_id is null then
    if not app.has_permission(p_company_id, 'quotes', 'create') then
      raise exception 'Permission de création de devis refusée' using errcode = '42501';
    end if;
  else
    if not app.has_permission(p_company_id, 'quotes', 'update') then
      raise exception 'Permission de modification de devis refusée' using errcode = '42501';
    end if;

    perform 1
    from public.quotes q
    where q.id = p_quote_id
      and q.company_id = p_company_id
      and q.status = 'draft'
    for update;

    if not found then
      raise exception 'Brouillon introuvable ou non modifiable' using errcode = '42501';
    end if;
  end if;

  select c.default_currency
    into v_currency
  from public.companies c
  where c.id = p_company_id
    and c.status = 'active';

  if v_currency is null then
    raise exception 'Entreprise active introuvable' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.id = p_customer_id
      and c.company_id = p_company_id
      and c.status = 'active'
  ) then
    raise exception 'Client actif introuvable dans cette entreprise' using errcode = '22023';
  end if;

  if p_quote_id is null then
    insert into public.quotes (
      company_id, customer_id, issue_date, valid_until, currency_code,
      subject, terms, notes, created_by, updated_by
    ) values (
      p_company_id, p_customer_id, p_issue_date, v_valid_until, v_currency,
      nullif(btrim(p_subject), ''), nullif(btrim(p_terms), ''), nullif(btrim(p_notes), ''),
      v_actor, v_actor
    )
    returning id into v_quote_id;
  else
    v_quote_id := p_quote_id;
    update public.quotes
    set customer_id = p_customer_id,
        issue_date = p_issue_date,
        valid_until = v_valid_until,
        currency_code = v_currency,
        subject = nullif(btrim(p_subject), ''),
        terms = nullif(btrim(p_terms), ''),
        notes = nullif(btrim(p_notes), ''),
        subtotal_amount = 0,
        discount_amount = 0,
        total_amount = 0,
        updated_by = v_actor,
        updated_at = now()
    where id = v_quote_id and company_id = p_company_id;

    delete from public.quote_lines
    where quote_id = v_quote_id and company_id = p_company_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_lines)
  loop
    v_position := v_position + 1;

    if jsonb_typeof(v_item) <> 'object'
       or nullif(btrim(v_item ->> 'description'), '') is null
       or nullif(btrim(v_item ->> 'unit_label'), '') is null
       or coalesce(v_item ->> 'quantity', '') = ''
       or coalesce(v_item ->> 'unit_price', '') = '' then
      raise exception 'Ligne de devis incomplète (position %)', v_position using errcode = '22023';
    end if;

    v_description := btrim(v_item ->> 'description');
    v_unit_label := btrim(v_item ->> 'unit_label');
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unit_price')::numeric;
    v_discount_type := coalesce(nullif(v_item ->> 'discount_type', ''), 'none');
    v_discount_value := coalesce(nullif(v_item ->> 'discount_value', '')::numeric, 0);

    if length(v_description) > 500 or length(v_unit_label) > 40
       or v_quantity <= 0 or v_unit_price < 0 or v_discount_value < 0
       or v_discount_type not in ('none', 'percentage', 'fixed') then
      raise exception 'Valeur invalide à la ligne %', v_position using errcode = '22023';
    end if;

    -- Pas de taxe dans la première tranche : les taux et exonérations
    -- attendent la validation du profil fiscal par un professionnel.
    if nullif(v_item ->> 'tax_rate', '') is not null
       or nullif(v_item ->> 'tax_label', '') is not null then
      raise exception 'Les taxes ne sont pas configurées pour les devis brouillons' using errcode = '22023';
    end if;

    v_base := round(v_quantity * v_unit_price, 4);

    v_discount := case v_discount_type
      when 'none' then 0
      when 'percentage' then round(v_base * v_discount_value / 100, 4)
      when 'fixed' then round(v_discount_value, 4)
      else 0
    end;

    if v_discount > v_base or (v_discount_type = 'percentage' and v_discount_value > 100) then
      raise exception 'Remise supérieure au montant de la ligne %', v_position using errcode = '22023';
    end if;

    v_taxable := v_base - v_discount;
    v_subtotal := v_subtotal + v_base;
    v_discount_total := v_discount_total + v_discount;

    insert into public.quote_lines (
      company_id, quote_id, position, description, quantity, unit_label,
      unit_price, discount_type, discount_value, base_amount, discount_amount,
      taxable_amount, tax_amount, total_amount
    ) values (
      p_company_id, v_quote_id, v_position, v_description, v_quantity, v_unit_label,
      v_unit_price, v_discount_type, v_discount_value, v_base, v_discount,
      v_taxable, 0, v_taxable
    );
  end loop;

  update public.quotes
  set subtotal_amount = round(v_subtotal, 4),
      discount_amount = round(v_discount_total, 4),
      tax_amount = 0,
      total_amount = round(v_subtotal - v_discount_total, 4),
      updated_by = v_actor,
      updated_at = now()
  where id = v_quote_id and company_id = p_company_id;

  perform app.log_event(
    p_company_id,
    case when p_quote_id is null then 'quotes.draft_created' else 'quotes.draft_updated' end,
    'quotes',
    v_quote_id,
    jsonb_build_object(
      'line_count', v_position,
      'subtotal_amount', round(v_subtotal, 4),
      'discount_amount', round(v_discount_total, 4),
      'total_amount', round(v_subtotal - v_discount_total, 4)
    )
  );

  return v_quote_id;
end;
$$;

revoke all on function public.save_quote_draft(uuid, uuid, jsonb, date, date, uuid, text, text, text)
  from public, anon;
grant execute on function public.save_quote_draft(uuid, uuid, jsonb, date, date, uuid, text, text, text)
  to authenticated;

-- Le rôle service_role conserve ses capacités administratives Supabase.
