# Audit de la Phase 1

**Date de l'audit :** 23 octobre 2026.

**Statut : la Phase 1 n'est pas consolidée.** L'ensemble du dépôt fait l'objet d'un audit complet avant toute nouvelle fonctionnalité métier. Une tâche n'est marquée « fait » que si elle est couverte par une preuve vérifiable (test, CI, inspection).

## 1. Ce que l'audit a vérifié

| Domaine | Preuve | Résultat |
|---|---|---|
| Qualité | `npm ci`, lint, TypeScript, tests, build en CI sur chaque fusion | OK |
| Tests | Isolation entre entreprises, permissions par rôle, révocation, compte désactivé, audit, clients/fournisseurs | OK (sur PGlite) |
| Dépendances | `npm audit` en production | 0 vulnérabilité ; 5 alertes de développement connues (voir §6) |
| Secrets | Recherche dans le code et dans tout l'historique Git | Aucun secret trouvé ; la clé privilégiée Supabase n'est utilisée nulle part dans le code |
| Authentification | Lecture du code : redirections sûres, origine fixée par configuration, échec fermé, aucune donnée personnelle dans les journaux | OK |
| Fonctions SQL | Inspection de `pg_proc` : toutes les fonctions `SECURITY DEFINER` ont `search_path` vide ; exécution limitée à `postgres` et, pour cinq fonctions d'autorisation, à `authenticated` ; rien d'ouvert à `PUBLIC` ni à `anon` | OK |
| RLS | Garde-fou en test : échec si une table du schéma `public` n'a pas la RLS | OK |
| Sauvegarde | Test de bout en bout avec comparaison des données, des définitions de sécurité et de l'isolation après restauration | OK sur PostgreSQL standard |

## 2. Constats et état

| N° | Constat | Exigence | État |
|---|---|---|---|
| 1 | Migrations et RLS jamais validées sur la pile Supabase réelle (tests sur PGlite avec une doublure du schéma `auth`) | SEC-02, ACC-01 | CI sur Supabase local réel : PR ouverte (#22). **Reste à votre charge :** appliquer et vérifier sur le projet hébergé |
| 2 | Réglages d'authentification du projet hébergé inconnus. La configuration locale (`supabase/config.toml`) autorise 6 caractères et désactive la confirmation d'e-mail ; l'API d'authentification étant appelable directement, les règles du formulaire ne suffisent pas | SEC-01 | **À votre charge** (voir §3) |
| 3 | Protection de `main` non vérifiable depuis la CI ; un commit direct a eu lieu sur `main` le 20/10 | §14 (organisation GitHub) | **À votre charge** (voir §3) |
| 4 | Matrice des rôles et permissions non validée par le porteur du projet ; le module clients/fournisseurs s'appuie déjà dessus | §4 | **Décision attendue** |
| 5 | Documentation en retard sur le code (authentification, tableau de bord réel, module clients/fournisseurs) | §14, définition de « terminé » | Corrigé dans ce document, le README et la feuille de route |
| 6 | Le test de restauration ne contenait aucune donnée clients/fournisseurs | ACC-07 | PR ouverte (#23) |
| 7 | Aucun en-tête de sécurité HTTP | SEC-03 | PR ouverte (#23). Une CSP stricte avec `script-src` et nonce impose un rendu dynamique de toutes les pages : chantier dédié |
| 8 | Parcours inscription / connexion / onboarding non testés de bout en bout (tests unitaires de validation seulement) | §13 | **À faire** |
| 9 | Tests clients/fournisseurs incomplets (membre révoqué, compte désactivé, modification inter-entreprises, déplacement, usurpation de l'auteur) | ACC-01, ACC-05 | PR ouverte (#23) |
| 10 | Données personnelles des contacts (e-mails, téléphones, identifiants fiscaux) sans durée de conservation ni procédure d'effacement ou d'anonymisation ; l'archivage est la seule opération | §11 | **Décision attendue**, avec un conseil local |
| 11 | Aucune limite au nombre d'entreprises créées par un compte ; pas de protection anti-abus à l'inscription | SEC-01 | **À faire** |
| 12 | Quatre PR Dependabot ouvertes depuis le 19/10 | §14 | À examiner une par une |
| 13 | `.gitignore` de `apps/web` en encodage ISO-8859 (corrompu), récurrent | Maintenabilité | Corrigé : `.editorconfig` et contrôle d'encodage en CI |

## 3. Actions à votre charge

1. **Réglages d'authentification du projet Supabase** (tableau de bord) : longueur minimale du mot de passe alignée sur l'application (au moins 8), confirmation d'e-mail activée, expéditeur d'e-mails personnalisé pour la production, URL du site et URL de redirection autorisées limitées à votre domaine. Vérifier si la protection contre les mots de passe compromis est disponible sur votre offre.
2. **Protection de `main`** (réglages GitHub) : exiger une pull request, exiger les contrôles « Web — lint, types, tests, build » et « Scripts shell — shellcheck », interdire les poussées directes.
3. **Valider la matrice des rôles** : en particulier, l'administrateur d'entreprise n'a pas accès à la paie et la finance ne lit pas le journal d'audit.
4. **Appliquer les migrations sur le projet hébergé** et vérifier que l'isolation tient, après la fusion de la PR #22.

## 4. Décisions attendues du porteur du projet

Ces décisions bloquent la mise en production (cahier des charges §10, §11, §16) :

- région d'hébergement (latence depuis le Burkina contre transfert de données hors du pays, CIL) ;
- sauvegardes : fréquence, rétention, destination séparée, chiffrement, alertes d'échec, objectifs RPO/RTO, essai de restauration en préproduction ;
- ce que l'équipe plateforme peut voir des données clients, et dans quelles circonstances ;
- durée de conservation et procédure d'effacement des données personnelles ;
- licence du dépôt, nom du produit.

## 5. Critères de sortie de la Phase 1

La Phase 1 pourra être déclarée consolidée quand :

1. l'authentification et le cycle de vie des comptes sont testés de bout en bout dans un environnement de test ;
2. les tests d'accès positifs et négatifs passent pour chaque rôle et couvrent les chemins de données pertinents ;
3. les migrations et tests sont reproductibles depuis un clone vierge **et validés sur le projet Supabase hébergé** ;
4. la sauvegarde/restauration démontre la conservation des données et des définitions de sécurité ;
5. la CI est verte sur la branche candidate et les contrôles sont exigés avant fusion ;
6. les décisions d'hébergement, de secrets, de sauvegardes et d'exploitation sont documentées.

**Interdiction de mise en production :** n'utiliser aucune donnée réelle de client, de salarié ou de paie avant revue de sécurité, validation métier et décision explicite de mise en production.

## 6. Risque résiduel connu — dépendances de développement

Au 21 octobre 2026, `npm audit` signale cinq alertes de sévérité élevée liées à la chaîne de dépendances de développement `eslint-config-next` -> `@next/eslint-plugin-next` -> `fast-glob` -> `micromatch` -> `braces@3.0.3`. Elles sont associées à l'avis GHSA-vfj7-8cjw-p6xm (CVE-2026-93687), relatif à un risque d'épuisement de pile avec des motifs profondément imbriqués.

L'audit `npm audit --omit=dev --audit-level=high` retourne zéro vulnérabilité. L'avis consulté ne répertorie aucune version corrigée. Ne pas exécuter `npm audit fix --force` : la correction proposée entraîne une rétrogradation majeure de `eslint-config-next`. Réévaluer ce risque lorsqu'une correction compatible sera disponible.
