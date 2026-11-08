-- Phase 2B — fondation des factures brouillons.
-- Aucun numéro, snapshot fiscal, taux de taxe ni émission n'est créé ici :
-- l'émission légale attend la validation de la procédure fiscale
-- (docs/CONFORMITE_FISCALE_BURKINA_FACTURATION.md). Un brouillon ne réduit
-- jamais le reste à facturer d'un devis.

-- ---------------------------------------------------------------------------
-- Intégrité référentielle : cohérence client du devis source
-- ---------------------------------------------------------------------------

alter table public.quotes
  add constraint quotes_company_id_id_customer_id_key unique (company_id, id, customer_id);

-- ---------------------------------------------------------------------------
-- Tables métier
-- ---------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  customer_id uuid not null,
  source_quote_id uuid,
  invoice_number text,
  status text not null default 'draft'
    check (status in ('draft', 'abandoned_draft')),
  billing_kind text not null default 'standalone'
    check (billing_kind in ('standalone', 'full')),
  issue_date date not null default current_date,
  due_date date,
  currency_code char(3) not null,
  subject text check (subject is null or length(subject) <= 200),
  customer_snapshot jsonb,
  issuer_snapshot jsonb,
  terms text check (terms is null or length(terms) <= 5000),
  notes text check (notes is null or length(notes) <= 5000),
  subtotal_amount numeric(20,4) not null default 0
    check (subtotal_amount >= 0 and subtotal_amount < 'Infinity'::numeric),
  discount_amount numeric(20,4) not null default 0
    check (discount_amount >= 0 and discount_amount < 'Infinity'::numeric),
  tax_amount numeric(20,4) not null default 0 check (tax_amount = 0),
  total_amount numeric(20,4) not null default 0
    check (total_amount >= 0 and total_amount < 'Infinity'::numeric),
  quote_allocated_amount numeric(20,4) check (quote_allocated_amount is null),
  abandoned_at timestamptz,
  abandoned_by uuid references public.users(id) on delete set null,
  abandon_reason text check (abandon_reason is null or length(abandon_reason) between 3 and 500),
  created_by uuid not null default auth.uid() references public.users(id) on delete restrict,
  updated_by uuid not null default auth.uid() references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, id, source_quote_id),
  unique (company_id, invoice_number),
  foreign key (company_id, customer_id)
    references public.customers(company_id, id) on delete restrict,
  foreign key (company_id, source_quote_id, customer_id)
    references public.quotes(company_id, id, customer_id) on delete restrict,
  check (currency_code ~ '^[A-Z]{3}$'),
  check (due_date is null or due_date >= issue_date),
  check (discount_amount <= subtotal_amount),
  check (total_amount = subtotal_amount - discount_amount),
  check ((billing_kind = 'standalone') = (source_quote_id is null)),
  check (invoice_number is null and customer_snapshot is null and issuer_snapshot is null),
  check (
    (status = 'draft' and abandoned_at is null and abandoned_by is null and abandon_reason is null)
    or (status = 'abandoned_draft' and abandoned_at is not null and abandon_reason is not null)
  )
);

comment on table public.invoices is
  'Factures par entreprise. Cette première tranche ne gère que les brouillons ; aucun numéro, snapshot ou émission n’est possible avant validation fiscale.';

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  invoice_id uuid not null,
  source_quote_id uuid,
  source_quote_line_id uuid,
  position integer not null check (position > 0),
  line_kind text not null default 'standard' check (line_kind = 'standard'),
  description text not null check (description = btrim(description) and length(description) between 1 and 500),
  quantity numeric(18,4) not null check (quantity > 0),
  unit_label text not null check (unit_label = btrim(unit_label) and length(unit_label) between 1 and 40),
  unit_price numeric(20,4) not null check (unit_price >= 0 and unit_price < 'Infinity'::numeric),
  discount_type text not null default 'none'
    check (discount_type in ('none', 'percentage', 'fixed')),
  discount_value numeric(20,4) not null default 0
    check (discount_value >= 0 and discount_value < 'Infinity'::numeric),
  tax_label text,
  tax_rate numeric(9,6),
  base_amount numeric(20,4) not null check (base_amount >= 0 and base_amount < 'Infinity'::numeric),
  discount_amount numeric(20,4) not null check (discount_amount >= 0 and discount_amount < 'Infinity'::numeric),
  taxable_amount numeric(20,4) not null check (taxable_amount >= 0 and taxable_amount < 'Infinity'::numeric),
  tax_amount numeric(20,4) not null default 0 check (tax_amount = 0),
  total_amount numeric(20,4) not null check (total_amount >= 0 and total_amount < 'Infinity'::numeric),
  created_at timestamptz not null default now(),
  unique (company_id, invoice_id, id),
  unique (company_id, invoice_id, position),
  -- This FK must not depend on nullable source_quote_id: standalone
  -- invoice lines still have to reference an existing invoice.
  foreign key (company_id, invoice_id)
    references public.invoices(company_id, id) on delete restrict,
  foreign key (company_id, invoice_id, source_quote_id)
    references public.invoices(company_id, id, source_quote_id) on delete restrict,
  foreign key (company_id, source_quote_id, source_quote_line_id)
    references public.quote_lines(company_id, quote_id, id) on delete restrict,
  check (
    (source_quote_id is null and source_quote_line_id is null)
    or (source_quote_id is not null and source_quote_line_id is not null)
  ),
  check (discount_amount <= base_amount),
  check (taxable_amount = base_amount - discount_amount),
  check (total_amount = taxable_amount),
  check (tax_rate is null and tax_label is null)
);

comment on table public.invoice_lines is
  'Lignes de facture brouillon. Les taxes ne sont volontairement pas calculées dans cette tranche, en attente de validation fiscale.';

create index invoices_company_status_date_idx
  on public.invoices(company_id, status, issue_date desc);
create index invoices_company_customer_date_idx
  on public.invoices(company_id, customer_id, issue_date desc);
create index invoices_company_source_quote_status_idx
  on public.invoices(company_id, source_quote_id, status);
create index invoice_lines_company_invoice_position_idx
  on public.invoice_lines(company_id, invoice_id, position);
create index invoice_lines_company_source_quote_line_idx
  on public.invoice_lines(company_id, source_quote_id, source_quote_line_id);

-- ---------------------------------------------------------------------------
-- Accès : lecture RLS ; toutes les écritures passent par des fonctions
-- SECURITY DEFINER. Aucun droit de suppression n'est accordé.
-- ---------------------------------------------------------------------------

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

revoke all on table public.invoices, public.invoice_lines from public, anon, authenticated;
grant select on table public.invoices, public.invoice_lines to authenticated;

create policy invoices_select
  on public.invoices for select to authenticated
  using (app.has_permission(company_id, 'invoices', 'read'));

create policy invoice_lines_select
  on public.invoice_lines for select to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_lines.invoice_id
        and i.company_id = invoice_lines.company_id
        and app.has_permission(i.company_id, 'invoices', 'read')
    )
  );

-- ---------------------------------------------------------------------------
-- Calcul serveur d'une ligne : aucune taxe n'est présumée.
-- ---------------------------------------------------------------------------

create function app.invoice_line_amounts(
  p_quantity numeric,
  p_unit_price numeric,
  p_discount_type text,
  p_discount_value numeric,
  p_position integer,
  out o_base numeric,
  out o_discount numeric
)
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_quantity is null or p_unit_price is null or p_discount_value is null
     or p_quantity <= 0 or p_unit_price < 0 or p_discount_value < 0
     or p_quantity >= 'Infinity'::numeric or p_unit_price >= 'Infinity'::numeric
     or p_discount_value >= 'Infinity'::numeric
     or p_discount_type not in ('none', 'percentage', 'fixed') then
    raise exception 'Valeur invalide à la ligne %', p_position using errcode = '22023';
  end if;

  o_base := round(p_quantity * p_unit_price, 4);
  o_discount := case p_discount_type
    when 'percentage' then round(o_base * p_discount_value / 100, 4)
    when 'fixed' then round(p_discount_value, 4)
    else 0
  end;

  if o_discount > o_base or (p_discount_type = 'percentage' and p_discount_value > 100) then
    raise exception 'Remise supérieure au montant de la ligne %', p_position using errcode = '22023';
  end if;
end;
$$;

revoke all on function app.invoice_line_amounts(numeric, numeric, text, numeric, integer)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Brouillon autonome : création et modification.
-- ---------------------------------------------------------------------------

create function public.save_invoice_draft(
  p_company_id uuid,
  p_customer_id uuid,
  p_lines jsonb,
  p_issue_date date,
  p_due_date date default null,
  p_invoice_id uuid default null,
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
  v_invoice_id uuid;
  v_currency char(3);
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
  v_subtotal numeric(20,4) := 0;
  v_discount_total numeric(20,4) := 0;
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if p_company_id is null or p_customer_id is null or p_issue_date is null then
    raise exception 'Entreprise, client et date de facture requis' using errcode = '22023';
  end if;

  if p_due_date is not null and p_due_date < p_issue_date then
    raise exception 'L’échéance ne peut pas précéder la date de facture' using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) not between 1 and 100 then
    raise exception 'La facture doit contenir entre 1 et 100 lignes' using errcode = '22023';
  end if;

  if p_subject is not null and length(p_subject) > 200
     or p_terms is not null and length(p_terms) > 5000
     or p_notes is not null and length(p_notes) > 5000 then
    raise exception 'Un champ texte dépasse la longueur autorisée' using errcode = '22023';
  end if;

  if p_invoice_id is null then
    if not app.has_permission(p_company_id, 'invoices', 'create') then
      raise exception 'Permission de création de facture refusée' using errcode = '42501';
    end if;
  else
    if not app.has_permission(p_company_id, 'invoices', 'update') then
      raise exception 'Permission de modification de facture refusée' using errcode = '42501';
    end if;

    -- Seuls les brouillons autonomes sont modifiables ici : les lignes d'un
    -- brouillon issu d'un devis reprennent le prix accepté.
    perform 1
    from public.invoices i
    where i.id = p_invoice_id
      and i.company_id = p_company_id
      and i.status = 'draft'
      and i.billing_kind = 'standalone'
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

  if p_invoice_id is null then
    insert into public.invoices (
      company_id, customer_id, issue_date, due_date, currency_code,
      subject, terms, notes, created_by, updated_by
    ) values (
      p_company_id, p_customer_id, p_issue_date, p_due_date, v_currency,
      nullif(btrim(p_subject), ''), nullif(btrim(p_terms), ''), nullif(btrim(p_notes), ''),
      v_actor, v_actor
    )
    returning id into v_invoice_id;
  else
    v_invoice_id := p_invoice_id;
    update public.invoices
    set customer_id = p_customer_id,
        issue_date = p_issue_date,
        due_date = p_due_date,
        currency_code = v_currency,
        subject = nullif(btrim(p_subject), ''),
        terms = nullif(btrim(p_terms), ''),
        notes = nullif(btrim(p_notes), ''),
        subtotal_amount = 0,
        discount_amount = 0,
        total_amount = 0,
        updated_by = v_actor,
        updated_at = now()
    where id = v_invoice_id and company_id = p_company_id;

    delete from public.invoice_lines
    where invoice_id = v_invoice_id and company_id = p_company_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_lines)
  loop
    v_position := v_position + 1;

    if jsonb_typeof(v_item) <> 'object'
       or nullif(btrim(v_item ->> 'description'), '') is null
       or nullif(btrim(v_item ->> 'unit_label'), '') is null
       or coalesce(v_item ->> 'quantity', '') = ''
       or coalesce(v_item ->> 'unit_price', '') = '' then
      raise exception 'Ligne de facture incomplète (position %)', v_position using errcode = '22023';
    end if;

    v_description := btrim(v_item ->> 'description');
    v_unit_label := btrim(v_item ->> 'unit_label');
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unit_price')::numeric;
    v_discount_type := coalesce(nullif(v_item ->> 'discount_type', ''), 'none');
    v_discount_value := coalesce(nullif(v_item ->> 'discount_value', '')::numeric, 0);

    if length(v_description) > 500 or length(v_unit_label) > 40 then
      raise exception 'Valeur invalide à la ligne %', v_position using errcode = '22023';
    end if;

    if nullif(v_item ->> 'tax_rate', '') is not null
       or nullif(v_item ->> 'tax_label', '') is not null then
      raise exception 'Les taxes ne sont pas configurées pour les factures brouillons' using errcode = '22023';
    end if;

    select a.o_base, a.o_discount
      into v_base, v_discount
    from app.invoice_line_amounts(
      v_quantity, v_unit_price, v_discount_type, v_discount_value, v_position
    ) a;

    v_subtotal := v_subtotal + v_base;
    v_discount_total := v_discount_total + v_discount;

    insert into public.invoice_lines (
      company_id, invoice_id, position, description, quantity, unit_label,
      unit_price, discount_type, discount_value, base_amount, discount_amount,
      taxable_amount, tax_amount, total_amount
    ) values (
      p_company_id, v_invoice_id, v_position, v_description, v_quantity, v_unit_label,
      v_unit_price, v_discount_type, v_discount_value, v_base, v_discount,
      v_base - v_discount, 0, v_base - v_discount
    );
  end loop;

  update public.invoices
  set subtotal_amount = round(v_subtotal, 4),
      discount_amount = round(v_discount_total, 4),
      tax_amount = 0,
      total_amount = round(v_subtotal - v_discount_total, 4),
      updated_by = v_actor,
      updated_at = now()
  where id = v_invoice_id and company_id = p_company_id;

  perform app.log_event(
    p_company_id,
    case when p_invoice_id is null then 'invoices.draft_created' else 'invoices.draft_updated' end,
    'invoices',
    v_invoice_id,
    jsonb_build_object(
      'line_count', v_position,
      'subtotal_amount', round(v_subtotal, 4),
      'discount_amount', round(v_discount_total, 4),
      'total_amount', round(v_subtotal - v_discount_total, 4)
    )
  );

  return v_invoice_id;
end;
$$;

revoke all on function public.save_invoice_draft(uuid, uuid, jsonb, date, date, uuid, text, text, text)
  from public, anon;
grant execute on function public.save_invoice_draft(uuid, uuid, jsonb, date, date, uuid, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Brouillon issu d'un devis accepté : reprend client, devise, lignes et prix
-- acceptés (facture intégrale). Il n'impute rien au devis tant qu'il n'est
-- pas émis ; l'émission reste hors périmètre.
-- ---------------------------------------------------------------------------

create function public.create_invoice_draft_from_quote(
  p_quote_id uuid,
  p_issue_date date default current_date,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_quote public.quotes%rowtype;
  v_invoice_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if p_quote_id is null or p_issue_date is null then
    raise exception 'Devis et date de facture requis' using errcode = '22023';
  end if;

  if p_due_date is not null and p_due_date < p_issue_date then
    raise exception 'L’échéance ne peut pas précéder la date de facture' using errcode = '22023';
  end if;

  select q.*
    into v_quote
  from public.quotes q
  where q.id = p_quote_id
  for update;

  -- Même message pour un devis inexistant ou hors périmètre : pas de fuite.
  if not found or not app.has_permission(v_quote.company_id, 'invoices', 'create') then
    raise exception 'Permission de création de facture refusée' using errcode = '42501';
  end if;

  if v_quote.status <> 'accepted' then
    raise exception 'Seul un devis accepté peut être facturé' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.companies c
    where c.id = v_quote.company_id and c.status = 'active'
  ) then
    raise exception 'Entreprise active introuvable' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = v_quote.customer_id
      and c.company_id = v_quote.company_id
      and c.status = 'active'
  ) then
    raise exception 'Client actif introuvable dans cette entreprise' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.invoices i
    where i.company_id = v_quote.company_id
      and i.source_quote_id = v_quote.id
      and i.status = 'draft'
  ) then
    raise exception 'Un brouillon de facture existe déjà pour ce devis' using errcode = '22023';
  end if;

  insert into public.invoices (
    company_id, customer_id, source_quote_id, billing_kind, issue_date, due_date,
    currency_code, subject, terms, notes,
    subtotal_amount, discount_amount, tax_amount, total_amount,
    created_by, updated_by
  ) values (
    v_quote.company_id, v_quote.customer_id, v_quote.id, 'full', p_issue_date, p_due_date,
    v_quote.currency_code, v_quote.subject, v_quote.terms, v_quote.notes,
    v_quote.subtotal_amount, v_quote.discount_amount, 0, v_quote.total_amount,
    v_actor, v_actor
  )
  returning id into v_invoice_id;

  insert into public.invoice_lines (
    company_id, invoice_id, source_quote_id, source_quote_line_id, position,
    description, quantity, unit_label, unit_price, discount_type, discount_value,
    base_amount, discount_amount, taxable_amount, tax_amount, total_amount
  )
  select ql.company_id, v_invoice_id, ql.quote_id, ql.id, ql.position,
         ql.description, ql.quantity, ql.unit_label, ql.unit_price, ql.discount_type, ql.discount_value,
         ql.base_amount, ql.discount_amount, ql.taxable_amount, 0, ql.total_amount
  from public.quote_lines ql
  where ql.quote_id = v_quote.id
    and ql.company_id = v_quote.company_id
  order by ql.position;

  perform app.log_event(
    v_quote.company_id,
    'invoices.draft_created_from_quote',
    'invoices',
    v_invoice_id,
    jsonb_build_object(
      'source_quote_id', v_quote.id,
      'billing_kind', 'full',
      'total_amount', v_quote.total_amount
    )
  );

  return v_invoice_id;
end;
$$;

revoke all on function public.create_invoice_draft_from_quote(uuid, date, date)
  from public, anon;
grant execute on function public.create_invoice_draft_from_quote(uuid, date, date)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Abandon d'un brouillon : conserve la trace, ne supprime rien.
-- ---------------------------------------------------------------------------

create function public.abandon_invoice_draft(
  p_invoice_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_company_id uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if length(v_reason) not between 3 and 500 then
    raise exception 'Le motif d’abandon doit contenir entre 3 et 500 caractères' using errcode = '22023';
  end if;

  select i.company_id
    into v_company_id
  from public.invoices i
  where i.id = p_invoice_id
    and i.status = 'draft'
  for update;

  if not found or not app.has_permission(v_company_id, 'invoices', 'update') then
    raise exception 'Brouillon introuvable ou non modifiable' using errcode = '42501';
  end if;

  update public.invoices
  set status = 'abandoned_draft',
      abandoned_at = now(),
      abandoned_by = v_actor,
      abandon_reason = v_reason,
      updated_by = v_actor,
      updated_at = now()
  where id = p_invoice_id and company_id = v_company_id;

  perform app.log_event(
    v_company_id,
    'invoices.draft_abandoned',
    'invoices',
    p_invoice_id,
    jsonb_build_object('reason_length', length(v_reason))
  );
end;
$$;

revoke all on function public.abandon_invoice_draft(uuid, text) from public, anon;
grant execute on function public.abandon_invoice_draft(uuid, text) to authenticated;
