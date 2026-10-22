-- Module Clients & Fournisseurs - MVP
-- Sécurité multi-entreprises via RLS et permissions existantes.
-- Aucune suppression définitive autorisée depuis le rôle authenticated.

-- ---------------------------------------------------------------------------
-- Tables métier
-- ---------------------------------------------------------------------------

create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete restrict,
  name               text not null
                     check (name = btrim(name) and length(name) between 2 and 200),
  contact_name       text
                     check (contact_name is null or
                       (contact_name = btrim(contact_name) and length(contact_name) between 1 and 150)),
  email              text
                     check (email is null or
                       (email = btrim(email) and length(email) between 3 and 254)),
  phone              text
                     check (phone is null or
                       (phone = btrim(phone) and length(phone) between 3 and 40)),
  tax_identifier     text
                     check (tax_identifier is null or
                       (tax_identifier = btrim(tax_identifier) and length(tax_identifier) between 1 and 100)),
  address            text
                     check (address is null or
                       (address = btrim(address) and length(address) between 1 and 250)),
  city               text
                     check (city is null or
                       (city = btrim(city) and length(city) between 1 and 120)),
  country_code       text not null default 'BF'
                     check (country_code ~ '^[A-Z]{2}$'),
  payment_terms_days smallint not null default 0
                     check (payment_terms_days between 0 and 365),
  notes              text
                     check (notes is null or length(notes) <= 2000),
  status             text not null default 'active'
                     check (status in ('active', 'archived')),
  created_by         uuid default auth.uid()
                     references public.users(id) on delete set null,
  updated_by         uuid default auth.uid()
                     references public.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.customers is
  'Répertoire clients isolé par entreprise ; suppression définitive réservée aux procédures administratives contrôlées.';

create table public.suppliers (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete restrict,
  name               text not null
                     check (name = btrim(name) and length(name) between 2 and 200),
  contact_name       text
                     check (contact_name is null or
                       (contact_name = btrim(contact_name) and length(contact_name) between 1 and 150)),
  email              text
                     check (email is null or
                       (email = btrim(email) and length(email) between 3 and 254)),
  phone              text
                     check (phone is null or
                       (phone = btrim(phone) and length(phone) between 3 and 40)),
  tax_identifier     text
                     check (tax_identifier is null or
                       (tax_identifier = btrim(tax_identifier) and length(tax_identifier) between 1 and 100)),
  address            text
                     check (address is null or
                       (address = btrim(address) and length(address) between 1 and 250)),
  city               text
                     check (city is null or
                       (city = btrim(city) and length(city) between 1 and 120)),
  country_code       text not null default 'BF'
                     check (country_code ~ '^[A-Z]{2}$'),
  payment_terms_days smallint not null default 0
                     check (payment_terms_days between 0 and 365),
  notes              text
                     check (notes is null or length(notes) <= 2000),
  status             text not null default 'active'
                     check (status in ('active', 'archived')),
  created_by         uuid default auth.uid()
                     references public.users(id) on delete set null,
  updated_by         uuid default auth.uid()
                     references public.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.suppliers is
  'Répertoire fournisseurs isolé par entreprise ; suppression définitive réservée aux procédures administratives contrôlées.';

-- ---------------------------------------------------------------------------
-- Index destinés aux listes métier et au filtrage par entreprise
-- ---------------------------------------------------------------------------

create index customers_company_status_name_idx
  on public.customers (company_id, status, name);

create index suppliers_company_status_name_idx
  on public.suppliers (company_id, status, name);

-- ---------------------------------------------------------------------------
-- Horodatage et attribution des modifications
-- ---------------------------------------------------------------------------

create function app.touch_business_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger customers_touch
  before update on public.customers
  for each row execute function app.touch_business_contact();

create trigger suppliers_touch
  before update on public.suppliers
  for each row execute function app.touch_business_contact();

-- ---------------------------------------------------------------------------
-- Audit : seules les actions et les noms des champs modifiés sont journalisés.
-- Aucune valeur de contact n'est copiée dans les métadonnées.
-- ---------------------------------------------------------------------------

create function app.audit_business_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_changed_fields jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := tg_table_name || '.created';

    perform app.log_event(
      new.company_id,
      v_action,
      tg_table_name,
      new.id,
      jsonb_build_object('status', new.status)
    );

    return new;
  end if;

  select coalesce(jsonb_agg(changed.key order by changed.key), '[]'::jsonb)
    into v_changed_fields
  from (
    select n.key
    from jsonb_each(to_jsonb(new)) as n
    join jsonb_each(to_jsonb(old)) as o using (key)
    where n.value is distinct from o.value
      and n.key not in ('updated_at', 'updated_by')
  ) as changed;

  if jsonb_array_length(v_changed_fields) > 0 then
    v_action := tg_table_name || '.updated';

    perform app.log_event(
      new.company_id,
      v_action,
      tg_table_name,
      new.id,
      jsonb_build_object('changed_fields', v_changed_fields)
    );
  end if;

  return new;
end;
$$;

create trigger customers_audit
  after insert or update on public.customers
  for each row execute function app.audit_business_contact();

create trigger suppliers_audit
  after insert or update on public.suppliers
  for each row execute function app.audit_business_contact();

-- ---------------------------------------------------------------------------
-- Fonctions internes : pas d'exécution directe via les rôles API.
revoke all on function app.touch_business_contact() from public, anon, authenticated;
revoke all on function app.audit_business_contact() from public, anon, authenticated;
-- Privilèges : refus par défaut, sans suppression définitive
-- ---------------------------------------------------------------------------

revoke all on table public.customers from public, anon, authenticated;
revoke all on table public.suppliers from public, anon, authenticated;

grant select on table public.customers, public.suppliers to authenticated;

grant insert (
  company_id, name, contact_name, email, phone, tax_identifier,
  address, city, country_code, payment_terms_days, notes
) on public.customers to authenticated;

grant insert (
  company_id, name, contact_name, email, phone, tax_identifier,
  address, city, country_code, payment_terms_days, notes
) on public.suppliers to authenticated;

grant update (
  name, contact_name, email, phone, tax_identifier, address,
  city, country_code, payment_terms_days, notes, status
) on public.customers to authenticated;

grant update (
  name, contact_name, email, phone, tax_identifier, address,
  city, country_code, payment_terms_days, notes, status
) on public.suppliers to authenticated;

-- ---------------------------------------------------------------------------
-- RLS : autorisation liée à l'entreprise ET à la permission métier
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.suppliers enable row level security;

create policy customers_select
  on public.customers for select to authenticated
  using (app.has_permission(company_id, 'customers', 'read'));

create policy customers_insert
  on public.customers for insert to authenticated
  with check (app.has_permission(company_id, 'customers', 'create'));

create policy customers_update
  on public.customers for update to authenticated
  using (app.has_permission(company_id, 'customers', 'update'))
  with check (app.has_permission(company_id, 'customers', 'update'));

create policy suppliers_select
  on public.suppliers for select to authenticated
  using (app.has_permission(company_id, 'suppliers', 'read'));

create policy suppliers_insert
  on public.suppliers for insert to authenticated
  with check (app.has_permission(company_id, 'suppliers', 'create'));

create policy suppliers_update
  on public.suppliers for update to authenticated
  using (app.has_permission(company_id, 'suppliers', 'update'))
  with check (app.has_permission(company_id, 'suppliers', 'update'));