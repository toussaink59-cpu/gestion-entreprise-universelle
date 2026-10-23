# Base de données

Le schéma est la source de vérité du projet ([ADR-001](../docs/adr/0001-socle-technique.md)). Il vit dans des migrations SQL versionnées, appliquées dans l'ordre alphabétique.

## Contenu actuel

| Migration | Contenu |
|---|---|
| `20261021110000_identite_acces.sql` | Entreprises, profils, rôles et permissions, appartenances, journal d'audit, politiques RLS, création d'entreprise atomique |
| `20261022160000_clients_fournisseurs.sql` | Clients et fournisseurs : colonnes modifiables limitées, RLS liée aux permissions, archivage sans suppression définitive, audit sans valeurs de contact |

## Règles

- Une migration ne se modifie plus une fois fusionnée : on en ajoute une nouvelle.
- Toute table métier porte un `company_id`, a la RLS activée et des privilèges minimaux (refus par défaut).
- Toute migration est accompagnée de tests dans `apps/web/__tests__/db/`. Un test garde-fou échoue si une table du schéma `public` n'a pas la RLS.
- Aucune donnée réelle, aucun secret dans les migrations ni dans les jeux de test.

## Lancer les tests

Les tests rejouent les migrations sur un vrai PostgreSQL (PGlite), sans service externe :

```bash
cd apps/web
npm ci
npm test
```

`supabase/tests/auth_shim.sql` imite le schéma `auth` de Supabase (`auth.users`, `auth.uid()`, rôles `anon` et `authenticated`). Il sert **uniquement aux tests** : ne jamais l'appliquer en production.

## Limites connues (à traiter dans les prochaines phases)

- La matrice rôles/permissions est un point de départ **à valider** avec le porteur du projet.
- L'invitation par e-mail n'existe pas encore : on ne peut ajouter que des utilisateurs déjà inscrits.
- Création d'entreprises limitée à 5 par propriétaire (migration `20261024090000`, valeur à valider).
- L'accès exceptionnel de l'équipe plateforme aux données clients reste à concevoir (§4 du cahier des charges).

## Sauvegarde et restauration (ACC-07)

`scripts/test-restore.sh` prouve de bout en bout qu'une sauvegarde se restaure : il crée une base jetable (migrations + `supabase/tests/seed_restore.sql`, données fictives), la sauvegarde avec `scripts/backup-db.sh`, la restaure dans une base vierge avec `scripts/restore-db.sh`, puis compare les lignes (empreinte par table), la structure (RLS, politiques, déclencheurs, fonctions) et vérifie l'isolation sur la base restaurée.

Il tourne en CI chaque lundi (`.github/workflows/restore-test.yml`), à chaque changement des scripts ou du schéma, et à la demande.

En local, uniquement contre un serveur **jetable** (le script crée et supprime deux bases) :

```bash
ADMIN_URL=postgresql://postgres:motdepasse@localhost:5432/postgres ./scripts/test-restore.sh
```

Limites à connaître :

- Une sauvegarde `pg_dump` **ne contient pas les rôles** du serveur (`anon`, `authenticated`, `service_role`). Restaurer sur un nouveau serveur suppose que ces rôles existent (c'est le cas sur Supabase).
- Ce test valide la procédure sur un serveur PostgreSQL standard avec des données fictives. Il ne remplace ni la configuration des sauvegardes automatiques de l'hébergeur, ni une restauration à blanc sur l'environnement de préproduction.
- Les objectifs de perte et de durée (RPO/RTO) restent à décider (cahier des charges §10).
