-- Module Dépenses — première tranche : registre de brouillons uniquement.
-- Aucun paiement, mouvement de caisse, imputation comptable ou calcul fiscal n'est créé.
-- Les écritures passent par save_expense_draft ; RLS protège la lecture par entreprise.

-- La clé composite permet d'empêcher techniquement une dépense de référencer
-- un fournisseur appartenant à une autre entreprise.
create unique index suppliers_company_id_id_key
  on public.suppliers(company_id, id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  supplier_id uuid,
  expense_date date not null,
  category text not null
    check (category = btrim(category) and length(category) between 2 and 100),
  description text not null
    check (description = btrim(description) and length(description) between 2 and 500),
  amount numeric(20,4) not null check (amount > 0),
  currency_code char(3) not null check (currency_code ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status = 'draft'),
  notes text check (notes is null or length(notes) <= 2000),
  created_by uuid not null default auth.uid()
    references public.users(id) on delete restrict,
  updated_by uuid not null default auth.uid()
    references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, supplier_id)
    references public.suppliers(company_id, id) on delete restrict
);

comment on table public.expenses is
  'Dépenses en brouillon par entreprise. Cette tranche ne valide pas de dépense et ne crée aucun mouvement de trésorerie ou écriture comptable.';

create index expenses_company_date_idx
  on public.expenses(company_id, expense_date desc, created_at desc);
create index expenses_company_category_idx
  on public.expenses(company_id, category, expense_date desc);

create trigger expenses_touch
  before update on public.expenses
  for each row execute function app.touch_business_contact();

create trigger expenses_audit
  after insert or update on public.expenses
  for each row execute function app.audit_business_contact();

alter table public.expenses enable row level security;
revoke all on table public.expenses from public, anon, authenticated;
grant select on table public.expenses to authenticated;

create policy expenses_select
  on public.expenses for select to authenticated
  using (app.has_permission(company_id, 'expenses', 'read'));

create function public.save_expense_draft(
  p_company_id uuid,
  p_expense_date date,
  p_category text,
  p_description text,
  p_amount numeric,
  p_supplier_id uuid default null,
  p_notes text default null,
  p_expense_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_expense_id uuid;
  v_currency char(3);
begin
  if v_actor is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  if p_company_id is null or p_expense_date is null then
    raise exception 'Entreprise et date de dépense requises' using errcode = '22023';
  end if;

  if p_category is null
     or length(btrim(p_category)) not between 2 and 100
     or p_description is null
     or length(btrim(p_description)) not between 2 and 500
     or p_notes is not null and length(p_notes) > 2000 then
    raise exception 'Les champs texte de la dépense sont invalides' using errcode = '22023';
  end if;

  if p_amount is null
     or p_amount <= 0
     or scale(p_amount) > 4
     or p_amount >= 10000000000000000 then
    raise exception 'Le montant doit être positif et comporter au plus quatre décimales' using errcode = '22023';
  end if;

  if p_expense_id is null then
    if not app.has_permission(p_company_id, 'expenses', 'create') then
      raise exception 'Permission de création de dépense refusée' using errcode = '42501';
    end if;
  else
    if not app.has_permission(p_company_id, 'expenses', 'update') then
      raise exception 'Permission de modification de dépense refusée' using errcode = '42501';
    end if;

    perform 1
    from public.expenses e
    where e.id = p_expense_id
      and e.company_id = p_company_id
      and e.status = 'draft'
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

  if p_supplier_id is not null and not exists (
    select 1
    from public.suppliers s
    where s.id = p_supplier_id
      and s.company_id = p_company_id
      and s.status = 'active'
  ) then
    raise exception 'Fournisseur actif introuvable dans cette entreprise' using errcode = '22023';
  end if;

  if p_expense_id is null then
    insert into public.expenses (
      company_id, supplier_id, expense_date, category, description,
      amount, currency_code, notes, created_by, updated_by
    ) values (
      p_company_id, p_supplier_id, p_expense_date, btrim(p_category),
      btrim(p_description), p_amount, v_currency, nullif(btrim(p_notes), ''),
      v_actor, v_actor
    )
    returning id into v_expense_id;
  else
    v_expense_id := p_expense_id;
    update public.expenses
    set supplier_id = p_supplier_id,
        expense_date = p_expense_date,
        category = btrim(p_category),
        description = btrim(p_description),
        amount = p_amount,
        currency_code = v_currency,
        notes = nullif(btrim(p_notes), ''),
        updated_by = v_actor,
        updated_at = now()
    where id = v_expense_id
      and company_id = p_company_id
      and status = 'draft';
  end if;

  return v_expense_id;
end;
$$;

revoke all on function public.save_expense_draft(uuid, date, text, text, numeric, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.save_expense_draft(uuid, date, text, text, numeric, uuid, text, uuid)
  to authenticated;
