# Checklist de consolidation — Phase 1

**État de référence :** 21 octobre 2026. Cette checklist distingue ce qui existe dans le dépôt des critères encore à démontrer. Une tâche ne doit être marquée terminée que lorsqu’elle est couverte par une preuve vérifiable.

## Déjà présent dans le dépôt

- [x] Projet Next.js, React et TypeScript avec commandes lint, build, typecheck et tests.
- [x] Workflow CI qui exécute lint, build, vérification TypeScript, tests, audit des dépendances de production et ShellCheck.
- [x] Première migration PostgreSQL pour les entreprises, profils, appartenances, rôles, permissions et journal d’audit.
- [x] RLS activée sur les tables du schéma `public` de la migration actuelle.
- [x] Tests de base pour l’isolation entre deux entreprises, les rôles, la révocation et l’audit.
- [x] Scripts de sauvegarde/restauration et exercice CI sur une base PostgreSQL jetable avec données fictives.
- [x] `.env.example` et règles `.gitignore` pour éviter d’ajouter les fichiers d’environnement et les sauvegardes locales au dépôt.

Ces éléments ne suffisent pas à démontrer que toute la Phase 1 est prête pour la production.

## À terminer avant de déclarer la Phase 1 consolidée

### 1. Authentification et cycle de vie des comptes

- [ ] Connecter l’interface à l’environnement d’authentification retenu et documenter les variables réellement nécessaires.
- [ ] Tester inscription ou invitation, connexion, déconnexion, expiration/révocation de session et compte désactivé.
- [ ] Confirmer que la clé privilégiée Supabase, si elle est utilisée, ne peut jamais être envoyée au navigateur.
- [ ] Définir le flux d’invitation des utilisateurs déjà inscrits et non inscrits.

### 2. Rôles, permissions et RLS

- [ ] Faire valider la matrice des rôles par le porteur du projet avant de figer les permissions.
- [ ] Couvrir les opérations autorisées et refusées pour propriétaire, administrateur, finance, RH/paie, commercial, employé, auditeur et utilisateur sans entreprise.
- [ ] Tester lecture, création, modification, suppression, accès direct par identifiant et changement de rôle.
- [ ] Tester les scénarios multi-entreprises avec les véritables politiques PostgreSQL et une configuration proche de Supabase.
- [ ] Vérifier les permissions des fonctions `SECURITY DEFINER`, leurs `search_path`, les privilèges d’exécution et les chemins d’accès privilégiés.
- [ ] Maintenir le garde-fou qui fait échouer les tests si une nouvelle table applicative n’a pas RLS et des politiques adaptées.

### 3. Sauvegarde, restauration et exploitation

- [ ] Protéger les fichiers de sauvegarde par des permissions restrictives et une écriture atomique.
- [ ] Comparer les données et les définitions des colonnes, contraintes, index, politiques RLS, déclencheurs, fonctions et ACL après restauration.
- [ ] Vérifier que les rôles requis existent sur le serveur de restauration ; `pg_dump` ne sauvegarde pas les rôles globaux du serveur.
- [ ] Choisir une fréquence, une rétention, une destination séparée, un chiffrement et des alertes d’échec.
- [ ] Décider les objectifs RPO/RTO et effectuer un essai de restauration en préproduction.
- [ ] Documenter les procédures et s’assurer qu’aucun test destructif ne vise la production.

### 4. Qualité du dépôt et du workflow

- [ ] Garder README, roadmap et cahier des charges alignés avec l’état réel du code.
- [ ] Choisir une licence et préciser la propriété/intention de distribution du code.
- [ ] Exiger les contrôles CI réussis avant fusion dans `main` et limiter les permissions des workflows au strict nécessaire.
- [ ] Examiner les PR Dependabot individuellement ; ne pas fusionner une mise à jour uniquement parce qu’elle est disponible.
- [ ] Vérifier qu’aucun secret, jeton, dump ou donnée réelle n’est présent dans l’historique Git.

## Critères de sortie de Phase 1

La Phase 1 pourra être considérée comme consolidée quand :

1. l’authentification et le cycle de vie des comptes sont testés de bout en bout dans un environnement de test ;
2. les tests d’accès positifs et négatifs passent pour chaque rôle et couvrent les chemins de données pertinents ;
3. les migrations et tests sont reproductibles depuis un clone vierge ;
4. la sauvegarde/restauration démontre la conservation des données et des définitions de sécurité ;
5. la CI est verte sur la branche candidate et les contrôles sont exigés avant fusion ;
6. les décisions d’hébergement, de secrets, de sauvegardes et d’exploitation sont documentées.

**Interdiction de mise en production :** n’utiliser aucune donnée réelle de client, de salarié ou de paie avant revue de sécurité, validation métier et décision explicite de mise en production.


## Risque résiduel connu — dépendances de développement

Au 21 octobre 2026, `npm audit` signale cinq alertes de sévérité élevée liées à la chaîne de dépendances de développement `eslint-config-next` -> `@next/eslint-plugin-next` -> `fast-glob` -> `micromatch` -> `braces@3.0.3`. Elles sont associées à l'avis GHSA-vfj7-8cjw-p6xm (CVE-2026-93687), relatif à un risque d'épuisement de pile avec des motifs profondément imbriqués.

L'audit `npm audit --omit=dev --audit-level=high` retourne zéro vulnérabilité. L'avis consulté ne répertorie aucune version corrigée. Ne pas exécuter `npm audit fix --force` : la correction proposée entraîne une rétrogradation majeure de `eslint-config-next`. Réévaluer ce risque lorsqu'une correction compatible sera disponible.
