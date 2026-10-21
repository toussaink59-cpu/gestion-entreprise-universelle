# Base de données

Le schéma est la source de vérité du projet ([ADR-001](../docs/adr/0001-socle-technique.md)). Il vit dans des migrations SQL versionnées, appliquées dans l'ordre alphabétique.

## Contenu actuel

| Migration | Contenu |
|---|---|
| `20261021110000_identite_acces.sql` | Entreprises, profils, rôles et permissions, appartenances, journal d'audit, politiques RLS, création d'entreprise atomique |

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
- Pas encore de limitation du nombre d'entreprises créées par utilisateur.
- L'accès exceptionnel de l'équipe plateforme aux données clients reste à concevoir (§4 du cahier des charges).
