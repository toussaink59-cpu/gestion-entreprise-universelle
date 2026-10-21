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
