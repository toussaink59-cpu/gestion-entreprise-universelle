# ADR-001 — Socle technique : PostgreSQL standard hébergé sur Supabase

- **Statut :** proposé (à valider par le porteur du projet)
- **Date :** 21 octobre 2026
- **Références :** cahier des charges v0.1 §9, §10, §14, §16 ; `docs/ARCHITECTURE.md`

## Contexte

La plateforme est un SaaS multi-entreprises pour le Burkina Faso, avec une petite équipe et un budget limité. Le cahier des charges impose :

- une isolation stricte des données entre entreprises, vérifiée dans l'application **et** au niveau de la base (§7, SEC-02, ACC-01) ;
- des migrations de schéma versionnées et testées (§9) ;
- des sauvegardes automatiques et une restauration testée (SEC-06, ACC-07) ;
- un stockage privé des fichiers avec URLs temporaires (FR-DOC-01, SEC-07) ;
- une authentification éprouvée avec limitation des tentatives (SEC-01) ;
- une faible dépendance à un prestataire : exportabilité des données et coût de sortie évalués (§15).

## Décision

1. **Base de données :** PostgreSQL. Le **schéma est la source de vérité** et vit dans des **migrations SQL pures** dans `supabase/migrations/`, sans dépendre d'un ORM.
2. **Hébergement géré :** Supabase (PostgreSQL géré, authentification, stockage privé), tant que l'hébergement n'est pas contredit par les vérifications ci-dessous.
3. **Isolation :** chaque table métier porte un `company_id` ; la sécurité au niveau des lignes (RLS) est activée avec un accès **refusé par défaut**. Les vérifications côté serveur de l'application s'y ajoutent, elles ne les remplacent pas.
4. **Autorisations :** rôles et permissions par entreprise, module et action (consulter, créer, modifier, valider, annuler, exporter), évalués dans la base par des fonctions dédiées, dans un schéma privé `app`.
5. **Traçabilité :** `audit_events` en ajout seul (aucune modification ni suppression), alimenté par des fonctions et des déclencheurs.
6. **Tests :** les migrations sont rejouées en test contre un vrai moteur PostgreSQL (PGlite en CI, sans service externe), avec au moins deux entreprises de test. Un changement de schéma sans test d'isolation n'est pas fusionné.

## Conséquences

- Le SQL pur garde la sortie possible vers un autre hébergeur PostgreSQL.
- Les politiques RLS appellent `auth.uid()`, fourni par Supabase. Les tests utilisent une doublure minimale de ce schéma (`supabase/tests/auth_shim.sql`), jamais appliquée en production.
- Les types TypeScript seront générés depuis la base, pas écrits à la main.
- Un compte plateforme (support) n'a **pas** d'accès implicite aux données des clients (§4) : tout accès exceptionnel sera tracé. Son mécanisme reste à concevoir.

## Questions ouvertes (bloquantes avant la production)

| Sujet | Question | Qui décide |
|---|---|---|
| Région d'hébergement | Europe ou Afrique du Sud ? Latence depuis le Burkina contre transfert de données hors du pays (CIL, §11). | Porteur du projet + conseil local |
| Sauvegardes | L'offre retenue fournit-elle des sauvegardes exploitables ? Sinon, `pg_dump` planifié (scripts de `scripts/`). Fréquence, rétention, RPO/RTO. | Porteur du projet |
| Coût | Plan payant nécessaire en production ? Limites par entreprise. | Porteur du projet |
| Accès plateforme | Ce que l'équipe plateforme peut voir, et dans quelles circonstances. | Porteur du projet |

## Alternatives écartées

- **PostgreSQL auto-hébergé :** contrôle maximal, mais coût d'exploitation (sauvegardes, mises à jour, sécurité) trop élevé pour une petite équipe en phase 1.
- **ORM comme source du schéma :** masque les politiques RLS et les fonctions, qui sont au cœur de l'isolation.
