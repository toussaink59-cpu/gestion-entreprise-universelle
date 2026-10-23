-- Données FICTIVES pour le test de restauration (ACC-07). Aucune donnée réelle.
-- Appliqué après les migrations, en superutilisateur, sur une base jetable.

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'alice@example.test', '{"full_name":"Alice"}'),
  ('00000000-0000-4000-8000-00000000000b', 'bob@example.test',   '{"full_name":"Bob"}'),
  ('00000000-0000-4000-8000-00000000000c', 'carol@example.test', '{"full_name":"Carol"}');

-- Création des entreprises comme le fera l'application : le créateur devient propriétaire.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', false);
select public.create_company('Entreprise A (test de restauration)');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', false);
select public.create_company('Entreprise B (test de restauration)');

-- Carol rejoint l'entreprise A comme responsable finance (action de l'administratrice Alice).
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', false);
insert into public.company_memberships (company_id, user_id, role_code)
select id, '00000000-0000-4000-8000-00000000000c', 'finance'
from public.companies where legal_name like 'Entreprise A%';

select set_config('request.jwt.claim.sub', '', false);

-- Clients et fournisseurs fictifs : les données de ces tables doivent aussi survivre à la restauration.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000a', false);
insert into public.customers (company_id, name, contact_name, email, phone, payment_terms_days)
select id, c.name, c.contact_name, c.email, c.phone, c.terms
from public.companies,
     (values ('Client test A1', 'Contact A1', 'client-a1@example.test', '+226 00 00 00 01', 30),
             ('Client test A2', 'Contact A2', 'client-a2@example.test', '+226 00 00 00 02', 0)) as c(name, contact_name, email, phone, terms)
where legal_name like 'Entreprise A%';
insert into public.suppliers (company_id, name, email, payment_terms_days)
select id, 'Fournisseur test A1', 'fournisseur-a1@example.test', 15
from public.companies where legal_name like 'Entreprise A%';

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000000b', false);
insert into public.customers (company_id, name, email)
select id, 'Client test B1', 'client-b1@example.test'
from public.companies where legal_name like 'Entreprise B%';

select set_config('request.jwt.claim.sub', '', false);
