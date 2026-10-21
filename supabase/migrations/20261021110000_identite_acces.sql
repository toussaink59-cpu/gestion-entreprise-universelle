-- Migration 0001 — Identité, accès, rôles et journal d'audit (Phase 1)
--
-- Exigences : FR-ENT-01..05, SEC-02, SEC-05, ACC-01, ACC-05, ACC-06, ADR-001.
-- Principes : accès refusé par défaut ; RLS sur toutes les tables ; aucune écriture
-- directe sur les tables sensibles (passage par fonctions ou colonnes autorisées) ;
-- journal d'audit en ajout seul.
--
-- Nécessite le schéma `auth` de Supabase (auth.users, auth.uid()).
-- La matrice rôles/permissions ci-dessous est un point de départ À VALIDER.

-- ---------------------------------------------------------------------------
-- Schéma privé pour les fonctions internes (non exposé par l'API)
-- ---------------------------------------------------------------------------
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.companies (
  id               uuid primary key default gen_random_uuid(),
  legal_name       text not null check (length(btrim(legal_name)) > 0),
  trade_name       text,
  country_code     char(2) not null default 'BF',
  default_currency char(3) not null default 'XOF',
  timezone         text not null default 'Africa/Ouagadougou',
  status           text not null default 'active'
                   check (status in ('active', 'suspended', 'closed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.companies is
  'Entreprise cliente (tenant). Seule la création passe par create_company().';

create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  status     text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.users is
  'Profil applicatif ; l''authentification reste dans auth.users.';

create table public.roles (
  code        text primary key,
  label       text not null,
  description text
);

create table public.permissions (
  module text not null,
  action text not null check (action in ('read', 'create', 'update', 'validate', 'cancel', 'export')),
  primary key (module, action)
);

create table public.role_permissions (
  role_code text not null references public.roles (code) on delete cascade,
  module    text not null,
  action    text not null,
  primary key (role_code, module, action),
  foreign key (module, action) references public.permissions (module, action) on delete cascade
);

create table public.company_memberships (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  role_code  text not null references public.roles (code),
  status     text not null default 'active' check (status in ('invited', 'active', 'revoked')),
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (company_id, user_id)
);
create index company_memberships_user_idx on public.company_memberships (user_id);

-- Journal d'audit : ajout seul. Pas de clé étrangère sur l'acteur afin de conserver
-- la trace même si le compte est supprimé. Ne jamais y mettre de secret.
create table public.audit_events (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references public.companies (id) on delete restrict,
  actor_user_id uuid,
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index audit_events_company_idx on public.audit_events (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Données de référence : rôles, permissions (module × action)
-- ---------------------------------------------------------------------------
insert into public.roles (code, label, description) values
  ('owner',           'Propriétaire de l''entreprise', 'Gère l''espace, les utilisateurs et les paramètres.'),
  ('company_admin',   'Administrateur d''entreprise',  'Configure l''espace ; sans accès à la paie.'),
  ('finance',         'Finance / comptabilité',        'Factures, paiements, dépenses, budgets, rapports.'),
  ('hr_payroll',      'Responsable RH / paie',         'Dossiers employés et paie.'),
  ('sales_purchasing','Commercial / achats',           'Clients, devis, factures, achats affectés.'),
  ('operations',      'Responsable opérationnel',      'Droits limités à ses domaines.'),
  ('employee',        'Employé',                       'Consulte ses informations autorisées.'),
  ('auditor',         'Auditeur / lecture seule',      'Lecture et export d''un périmètre autorisé.');

insert into public.permissions (module, action)
select m, a
from unnest(array['company', 'members', 'customers', 'suppliers', 'invoices', 'payments',
                  'expenses', 'treasury', 'budgets', 'payroll', 'reports', 'audit']) as m,
     unnest(array['read', 'create', 'update', 'validate', 'cancel', 'export']) as a;

-- owner : tout
insert into public.role_permissions (role_code, module, action)
select 'owner', module, action from public.permissions;

-- company_admin : tout sauf la paie
insert into public.role_permissions (role_code, module, action)
select 'company_admin', module, action from public.permissions where module <> 'payroll';

-- finance
insert into public.role_permissions (role_code, module, action)
select 'finance', module, action from public.permissions
where module in ('invoices', 'payments', 'expenses', 'treasury', 'budgets', 'reports');
insert into public.role_permissions (role_code, module, action) values
  ('finance', 'company', 'read'), ('finance', 'customers', 'read'), ('finance', 'suppliers', 'read');

-- hr_payroll
insert into public.role_permissions (role_code, module, action)
select 'hr_payroll', module, action from public.permissions where module = 'payroll';
insert into public.role_permissions (role_code, module, action) values ('hr_payroll', 'company', 'read');

-- sales_purchasing
insert into public.role_permissions (role_code, module, action) values
  ('sales_purchasing', 'company', 'read'),
  ('sales_purchasing', 'customers', 'read'), ('sales_purchasing', 'customers', 'create'), ('sales_purchasing', 'customers', 'update'),
  ('sales_purchasing', 'suppliers', 'read'), ('sales_purchasing', 'suppliers', 'create'), ('sales_purchasing', 'suppliers', 'update'),
  ('sales_purchasing', 'invoices', 'read'),  ('sales_purchasing', 'invoices', 'create'),  ('sales_purchasing', 'invoices', 'update'),
  ('sales_purchasing', 'payments', 'read'),
  ('sales_purchasing', 'expenses', 'read'),  ('sales_purchasing', 'expenses', 'create');

-- operations, employee : lecture de l'entreprise uniquement (autres droits ajoutés avec leurs modules)
insert into public.role_permissions (role_code, module, action) values
  ('operations', 'company', 'read'), ('employee', 'company', 'read');

-- auditor : lecture + export, hors paie
insert into public.role_permissions (role_code, module, action)
select 'auditor', module, action from public.permissions
where module in ('company', 'customers', 'suppliers', 'invoices', 'payments', 'expenses',
                 'treasury', 'budgets', 'reports', 'audit')
  and action in ('read', 'export');

-- ---------------------------------------------------------------------------
-- Fonctions d'autorisation (security definer : évaluées sans récursion RLS)
-- ---------------------------------------------------------------------------
create function app.is_company_member(p_company_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships m
    join public.users u     on u.id = m.user_id and u.status = 'active'
    join public.companies c on c.id = m.company_id and c.status = 'active'
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create function app.has_permission(p_company_id uuid, p_module text, p_action text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships m
    join public.users u     on u.id = m.user_id and u.status = 'active'
    join public.companies c on c.id = m.company_id and c.status = 'active'
    join public.role_permissions rp
      on rp.role_code = m.role_code and rp.module = p_module and rp.action = p_action
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create function app.has_role(p_company_id uuid, p_role_code text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships m
    join public.users u     on u.id = m.user_id and u.status = 'active'
    join public.companies c on c.id = m.company_id and c.status = 'active'
    where m.company_id = p_company_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role_code = p_role_code
  );
$$;

-- Un utilisateur peut voir le profil d'un collègue seulement s'il a le droit members:read
create function app.can_see_user(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships m
    where m.user_id = p_user_id
      and m.status = 'active'
      and app.has_permission(m.company_id, 'members', 'read')
  );
$$;

-- ---------------------------------------------------------------------------
-- Journalisation (non exécutable par les utilisateurs : appelée par les déclencheurs)
-- ---------------------------------------------------------------------------
create function app.log_event(
  p_company_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb
) returns void
language sql security definer set search_path = ''
as $$
  insert into public.audit_events (company_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_company_id, (select auth.uid()), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

create function app.audit_no_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events est en ajout seul (% interdit)', tg_op using errcode = '42501';
end;
$$;

create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function app.audit_no_change();
create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function app.audit_no_change();

-- ---------------------------------------------------------------------------
-- Déclencheurs : mise à jour de updated_at, création du profil, audit, dernier propriétaire
-- ---------------------------------------------------------------------------
create function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_touch before update on public.companies
  for each row execute function app.touch_updated_at();
create trigger users_touch before update on public.users
  for each row execute function app.touch_updated_at();
create trigger memberships_touch before update on public.company_memberships
  for each row execute function app.touch_updated_at();

-- Profil applicatif créé automatiquement à l'inscription
create function app.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.users (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_user();

-- Audit des entreprises
create function app.audit_company()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform app.log_event(new.id, 'company.created', 'company', new.id,
      jsonb_build_object('country_code', new.country_code, 'currency', new.default_currency));
  else
    perform app.log_event(new.id, 'company.updated', 'company', new.id,
      jsonb_build_object('changed', (
        select coalesce(jsonb_agg(key), '[]'::jsonb)
        from jsonb_each(to_jsonb(new)) n
        join jsonb_each(to_jsonb(old)) o using (key)
        where n.value is distinct from o.value and key <> 'updated_at')));
  end if;
  return new;
end;
$$;

create trigger companies_audit after insert or update on public.companies
  for each row execute function app.audit_company();

-- Audit des droits d'accès (ACC-06)
create function app.audit_membership()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform app.log_event(new.company_id, 'membership.created', 'company_membership', new.id,
      jsonb_build_object('user_id', new.user_id, 'role', new.role_code, 'status', new.status));
  else
    if new.role_code is distinct from old.role_code then
      perform app.log_event(new.company_id, 'membership.role_changed', 'company_membership', new.id,
        jsonb_build_object('user_id', new.user_id, 'from', old.role_code, 'to', new.role_code));
    end if;
    if new.status is distinct from old.status then
      perform app.log_event(new.company_id, 'membership.status_changed', 'company_membership', new.id,
        jsonb_build_object('user_id', new.user_id, 'from', old.status, 'to', new.status));
    end if;
  end if;
  return new;
end;
$$;

create trigger memberships_audit after insert or update on public.company_memberships
  for each row execute function app.audit_membership();

-- Une entreprise ne peut pas perdre son dernier propriétaire actif
create function app.protect_last_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role_code = 'owner' and old.status = 'active'
     and (new.role_code <> 'owner' or new.status <> 'active')
     and not exists (
       select 1 from public.company_memberships m
       where m.company_id = old.company_id and m.id <> old.id
         and m.role_code = 'owner' and m.status = 'active')
  then
    raise exception 'une entreprise doit conserver au moins un propriétaire actif'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger memberships_protect_last_owner before update on public.company_memberships
  for each row execute function app.protect_last_owner();

-- ---------------------------------------------------------------------------
-- Création d'une entreprise : atomique, le créateur devient propriétaire (FR-ENT-02)
-- ---------------------------------------------------------------------------
create function public.create_company(
  p_legal_name   text,
  p_trade_name   text default null,
  p_country_code text default 'BF',
  p_currency     text default 'XOF',
  p_timezone     text default 'Africa/Ouagadougou'
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'authentification requise' using errcode = '28000';
  end if;
  if not exists (select 1 from public.users where id = v_uid and status = 'active') then
    raise exception 'compte inactif' using errcode = '42501';
  end if;

  insert into public.companies (legal_name, trade_name, country_code, default_currency, timezone)
  values (p_legal_name, p_trade_name, upper(p_country_code), upper(p_currency), p_timezone)
  returning id into v_id;

  insert into public.company_memberships (company_id, user_id, role_code, status)
  values (v_id, v_uid, 'owner', 'active');

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilèges : tout retirer, puis accorder le strict nécessaire (refus par défaut)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema app from public, anon, authenticated;

grant select on public.companies, public.users, public.roles, public.permissions,
                public.role_permissions, public.company_memberships, public.audit_events
  to authenticated;
-- Écritures limitées à des colonnes précises (pas de changement de statut, de devise ou de pays)
grant update (legal_name, trade_name, timezone) on public.companies to authenticated;
grant update (full_name) on public.users to authenticated;
grant insert (company_id, user_id, role_code, status, invited_by) on public.company_memberships to authenticated;
grant update (role_code, status, revoked_at) on public.company_memberships to authenticated;

grant execute on function app.is_company_member(uuid) to authenticated;
grant execute on function app.has_permission(uuid, text, text) to authenticated;
grant execute on function app.has_role(uuid, text) to authenticated;
grant execute on function app.can_see_user(uuid) to authenticated;
grant execute on function public.create_company(text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.companies           enable row level security;
alter table public.users               enable row level security;
alter table public.roles               enable row level security;
alter table public.permissions         enable row level security;
alter table public.role_permissions    enable row level security;
alter table public.company_memberships enable row level security;
alter table public.audit_events        enable row level security;

-- Référentiels : lecture seule pour tout utilisateur connecté
create policy roles_read            on public.roles            for select to authenticated using (true);
create policy permissions_read      on public.permissions      for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);

-- Entreprises
create policy companies_select on public.companies for select to authenticated
  using (app.is_company_member(id));
create policy companies_update on public.companies for update to authenticated
  using (app.has_permission(id, 'company', 'update'))
  with check (app.has_permission(id, 'company', 'update'));

-- Profils
create policy users_select on public.users for select to authenticated
  using (id = (select auth.uid()) or app.can_see_user(id));
create policy users_update on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Appartenances : chacun voit la sienne ; la liste complète exige members:read
create policy memberships_select on public.company_memberships for select to authenticated
  using (user_id = (select auth.uid()) or app.has_permission(company_id, 'members', 'read'));

-- Seul un propriétaire peut attribuer ou modifier le rôle « owner » ;
-- personne ne modifie sa propre appartenance (pas d'auto-promotion).
create policy memberships_insert on public.company_memberships for insert to authenticated
  with check (
    app.has_permission(company_id, 'members', 'create')
    and user_id <> (select auth.uid())
    and (role_code <> 'owner' or app.has_role(company_id, 'owner'))
  );
create policy memberships_update on public.company_memberships for update to authenticated
  using (
    app.has_permission(company_id, 'members', 'update')
    and user_id <> (select auth.uid())
    and (role_code <> 'owner' or app.has_role(company_id, 'owner'))
  )
  with check (
    app.has_permission(company_id, 'members', 'update')
    and user_id <> (select auth.uid())
    and (role_code <> 'owner' or app.has_role(company_id, 'owner'))
  );

-- Journal d'audit : lecture réservée à audit:read ; aucune écriture directe
create policy audit_events_select on public.audit_events for select to authenticated
  using (company_id is not null and app.has_permission(company_id, 'audit', 'read'));
