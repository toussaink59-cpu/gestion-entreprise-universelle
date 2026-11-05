begin;

alter table public.users
  add column preferred_locale text not null default 'fr'
  check (preferred_locale in ('fr', 'en'));

comment on column public.users.preferred_locale is
  'Préférence d’interface indépendante du pays, de la devise et du fuseau de l’entreprise.';

-- La policy users_update limite déjà chaque utilisateur à son propre profil.
-- Le privilège reste limité aux colonnes explicitement modifiables.
revoke update (full_name) on public.users from authenticated;
grant update (full_name, preferred_locale) on public.users to authenticated;

commit;
