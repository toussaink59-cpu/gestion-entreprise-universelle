# PHASE 1 — CHECKLIST DE CONSOLIDATION ET DE SÉCURISATION

**Projet :** Gestion d’entreprise universelle
**Dépôt :** `toussaink59-cpu/gestion-entreprise-universelle`
**Date de mise à jour :** 23 octobre 2026
**Branche de référence :** `main`
**Objectif :** disposer d’un socle technique fiable, testable et sécurisé avant d’étendre les fonctionnalités métier.

---

## 1. Objectifs de la Phase 1

La Phase 1 vise à consolider les fondations techniques de l’application avant le développement complet des modules de gestion d’entreprise.

Les priorités sont :

- Stabiliser le projet Next.js et son environnement de développement.
- Structurer les migrations de base de données et les règles d’isolation des données.
- Sécuriser les accès, les rôles et les opérations sensibles.
- Automatiser les tests et les contrôles qualité dans GitHub Actions.
- Vérifier la sauvegarde et la restauration des données.
- Préparer les validations nécessaires avant toute utilisation d’une base Supabase hébergée.
- Documenter les risques et les décisions techniques encore ouvertes.

**Règle de validation :** une tâche ne doit être déclarée terminée que si son résultat est vérifiable par un test, une configuration, une preuve d’exécution ou une décision documentée.

---

## 2. État des contrôles et des livrables

| N° | Domaine | État constaté | Référence / preuve | Action restante |
|---|---|---|---|---|
| 1 | Migrations et isolation des données | Partiellement validé | Tests de base de données, pile Supabase locale intégrée à la CI après fusion de la PR #22 | Vérifier les migrations et les politiques RLS sur un environnement hébergé contrôlé |
| 2 | Socle Next.js et TypeScript | Validé localement | `npm run lint`, `npm run typecheck` et `npm run build` réussis | Conserver les contrôles dans la CI |
| 3 | Tests automatisés | Validé localement | 7 fichiers de test et 89 tests réussis lors de la dernière vérification | Maintenir les tests et étendre la couverture des scénarios métier |
| 4 | Qualité du code | Validé localement | `git diff --check` sans erreur lors du dernier contrôle | Relancer avant chaque commit |
| 5 | Documentation technique | À contrôler | README, ADR et checklist de Phase 1 | Vérifier la cohérence avec la configuration et les workflows actuels |
| 6 | Sauvegarde et restauration | Implémenté, validation à conserver | Scripts `scripts/backup-db.sh` et `scripts/test-restore.sh`, workflow de restauration après fusion de la PR #23 | Vérifier une exécution réussie du workflow et conserver sa preuve |
| 7 | En-têtes HTTP de sécurité | Présents dans la configuration locale | `apps/web/next.config.ts` | Contrôler leur présence sur le déploiement et évaluer séparément la CSP stricte |
| 8 | Scripts shell | Contrôlés localement | ShellCheck réussi, code de sortie 0 ; règles LF dans `.gitattributes` | Conserver ShellCheck et les contrôles d’encodage dans la CI |
| 9 | Tests d’isolation et de sécurité | Partiellement validés | Tests clients/fournisseurs et travaux intégrés par la PR #23 | Vérifier la couverture exacte : révocation, comptes désactivés, accès croisés et permissions |
| 10 | Audit des dépendances de production | Validé au dernier contrôle | `npm audit --omit=dev --audit-level=high` : 0 vulnérabilité | Rejouer l’audit régulièrement et avant les déploiements |
| 11 | Audit complet des dépendances | Risque restant à traiter | 5 vulnérabilités de niveau élevé signalées dans les dépendances de développement lors du dernier audit | Surveiller les versions corrigées et éviter les mises à niveau incompatibles |
| 12 | Mises à jour Dependabot | À vérifier | PR #3, #4, #5 et #7 étaient ouvertes lors du dernier relevé | Vérifier leur état actuel, leur compatibilité et leurs résultats CI |
| 13 | Authentification Supabase hébergée | À valider | Aucune preuve de validation complète fournie ici | Tester les paramètres d’authentification et les redirections |
| 14 | Protection de la branche principale | À vérifier | Configuration GitHub à examiner | Vérifier les règles de protection et les contrôles obligatoires |
| 15 | Matrice des rôles et permissions | À formaliser | Décisions métier à documenter | Définir les permissions de chaque rôle et les tester |
| 16 | Tests de parcours utilisateur | À compléter | Parcours E2E à définir et à vérifier | Tester inscription, connexion, création d’entreprise et onboarding |
| 17 | Données personnelles | À formaliser | Politique de conservation et de suppression à définir | Documenter les règles de conservation, d’export et de suppression |
| 18 | Protection contre les abus | À formaliser | Limites de création et mesures anti-abus à définir | Définir les quotas et les protections nécessaires |
| 19 | Continuité de service | À formaliser | RPO, RTO et politique de sauvegarde à définir | Définir les objectifs et tester la procédure de reprise |
| 20 | Accès du personnel de la plateforme | À formaliser | Règles d’accès administratif à définir | Limiter les accès, documenter les actions sensibles et prévoir leur audit |
| 21 | Hébergement et conformité | À décider | Région d’hébergement, obligations légales et éventuelles formalités CIL à examiner | Documenter les choix et faire confirmer les obligations applicables |
| 22 | Licence et identité du produit | À décider | Licence et nom commercial définitif à confirmer | Documenter les décisions avant une diffusion publique |

**Attention :** les statuts ci-dessus reflètent les dernières informations disponibles, pas une nouvelle inspection en direct du dépôt. Les PR et workflows doivent être revérifiés avant de clôturer la Phase 1.

---

## 3. Base de données et migrations

### 3.1 Environnement local

- [ ] Vérifier que la pile Supabase locale démarre correctement.
- [ ] Vérifier que PostgreSQL est opérationnel.
- [ ] Vérifier que les migrations sont appliquées dans le bon ordre.
- [ ] Vérifier que les tests utilisent un environnement isolé.
- [ ] Vérifier que les politiques RLS sont activées et testées sur les tables concernées.
- [ ] Vérifier qu’un utilisateur ne peut pas lire ou modifier les données d’une autre entreprise.
- [ ] Vérifier que les tests couvrent les cas d’accès refusé.
- [ ] Vérifier que les migrations fonctionnent sur une base neuve.

### 3.2 Environnement Supabase hébergé

La PR #22 ayant été fusionnée, la CI dispose d’une intégration à la pile Supabase locale réelle. Cela ne prouve pas, à lui seul, que la configuration d’un projet Supabase hébergé est correcte.

Avant toute validation hébergée :

- [ ] Identifier explicitement l’environnement cible : développement, préproduction ou production.
- [ ] Vérifier le projet et la version du schéma.
- [ ] Examiner les migrations en attente.
- [ ] Confirmer la disponibilité d’une sauvegarde adaptée et d’une procédure de retour arrière.
- [ ] Préparer un plan de test et une procédure de vérification après migration.
- [ ] Effectuer d’abord la validation dans un environnement non productif.
- [ ] Consigner le résultat, la date et les éventuelles anomalies.

**Interdiction opérationnelle :** ne pas appliquer de migration à la base de production sans validation explicite préalable, sauvegarde appropriée et plan de retour arrière.

---

## 4. Sécurité et isolation multi-entreprises

L’application doit empêcher qu’un utilisateur puisse accéder aux informations d’une entreprise à laquelle il n’appartient pas.

### 4.1 Contrôles d’accès

- [ ] Définir les rôles métier nécessaires.
- [ ] Définir les permissions autorisées pour chaque rôle.
- [ ] Vérifier les autorisations côté serveur, pas uniquement dans l’interface.
- [ ] Refuser par défaut les opérations non autorisées.
- [ ] Vérifier l’isolation entre entreprises pour chaque module métier.
- [ ] Vérifier qu’un identifiant de ressource fourni par le client ne permet pas de contourner les permissions.
- [ ] Tester les utilisateurs désactivés et les sessions révoquées.
- [ ] Vérifier la protection des opérations d’administration.
- [ ] Documenter les actions sensibles et les journaux d’audit attendus.

### 4.2 En-têtes HTTP et configuration

Le fichier `apps/web/next.config.ts` contient une configuration d’en-têtes HTTP de sécurité.

- [ ] Vérifier les en-têtes dans la réponse HTTP du déploiement.
- [ ] Vérifier les directives de protection contre le clickjacking.
- [ ] Vérifier la politique de type de contenu.
- [ ] Vérifier la politique de référent.
- [ ] Vérifier la politique des fonctionnalités du navigateur.
- [ ] Évaluer séparément la mise en place d’une CSP stricte.
- [ ] Vérifier que les erreurs serveur ne révèlent aucune donnée sensible.
- [ ] Vérifier que les secrets ne sont pas exposés aux variables publiques du client.

La présence de la configuration dans le code ne remplace pas la vérification de son comportement réel après déploiement.

---

## 5. Sauvegarde et restauration

Scripts concernés :

- `scripts/backup-db.sh`
- `scripts/test-restore.sh`

### Contrôles à effectuer

- [ ] Vérifier que le script de sauvegarde s’interrompt en cas d’erreur.
- [ ] Vérifier les permissions du répertoire de sauvegarde.
- [ ] Vérifier que les fichiers temporaires ne sont pas exposés.
- [ ] Vérifier que les sauvegardes sont exploitables.
- [ ] Vérifier que la restauration s’effectue sur une base de test isolée.
- [ ] Vérifier qu’une erreur de restauration est signalée clairement.
- [ ] Vérifier que les données de test sont cohérentes après restauration.
- [ ] Exécuter le workflow GitHub de restauration.
- [ ] Conserver le lien de l’exécution réussie et les journaux utiles.
- [ ] Définir la fréquence de sauvegarde et la durée de conservation.
- [ ] Définir les objectifs RPO et RTO.
- [ ] Tester périodiquement la procédure de reprise.

La fusion de la PR #23 constitue un jalon d’intégration. La preuve d’une restauration réussie doit néanmoins être conservée.

---

## 6. Tests et intégration continue

### 6.1 Contrôles locaux

Depuis `apps/web`, exécuter les commandes suivantes :

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Depuis la racine du dépôt, vérifier également :

```powershell
git diff --check
git status --short
```

Les résultats de référence précédemment observés étaient :

- Lint : réussi.
- TypeScript : réussi.
- Tests : 7 fichiers et 89 tests réussis.
- Build Next.js : réussi.
- Audit des dépendances de production : 0 vulnérabilité.
- ShellCheck : réussi lors du dernier contrôle des scripts.

Ces résultats constituent un historique de validation ; ils doivent être reproduits après les changements qui les affectent.

### 6.2 GitHub Actions

- [ ] Vérifier que le workflow CI s’exécute sur les pull requests et les changements concernés.
- [ ] Vérifier les étapes Node.js, installation, lint, build, typecheck et tests.
- [ ] Vérifier le contrôle des dépendances de production.
- [ ] Vérifier ShellCheck.
- [ ] Vérifier le contrôle d’encodage des fichiers.
- [ ] Vérifier le workflow de restauration.
- [ ] Examiner les journaux des jobs échoués.
- [ ] Confirmer que la branche principale exige les contrôles appropriés avant fusion.

Ne pas déclarer la CI opérationnelle sur la seule base d’un fichier YAML présent dans le dépôt : une exécution réussie est nécessaire.

---

## 7. Gestion des dépendances

### 7.1 Vulnérabilités connues

Lors du dernier audit complet, cinq vulnérabilités de niveau élevé étaient signalées dans l’arbre de dépendances de développement, notamment autour de :

- `eslint-config-next@16.4.2`
- `@next/eslint-plugin-next@16.4.2`
- `fast-glob@3.3.1`
- `micromatch@4.0.8`
- `braces@3.0.3`

Le signalement concernait notamment un risque de consommation excessive de ressources lié à des motifs profondément imbriqués.

L’audit de production était, lui, sans vulnérabilité au dernier contrôle. Cela ne signifie pas que l’audit complet est propre.

### 7.2 Actions recommandées

- [ ] Rejouer `npm audit` et conserver le rapport.
- [ ] Vérifier les versions corrigées officiellement disponibles.
- [ ] Examiner les dépendances directes et transitives concernées.
- [ ] Évaluer les correctifs sans rétrograder arbitrairement Next.js.
- [ ] Tester chaque mise à jour avant fusion.
- [ ] Contrôler les pull requests Dependabot.
- [ ] Documenter le risque résiduel si aucun correctif compatible n’est disponible.

**Ne pas exécuter `npm audit fix --force` sans analyse préalable.** La proposition précédemment observée impliquait une rétrogradation majeure de `eslint-config-next`, susceptible de casser la compatibilité du projet.

Les versions et les avis de sécurité doivent être revérifiés avant toute décision définitive.

---

## 8. Vérification des pull requests

Les dernières informations disponibles indiquaient les PR suivantes :

| PR | Sujet / état connu | Action |
|---|---|---|
| #22 | Intégration de la pile Supabase locale à la CI — fusionnée | Vérifier que le workflow s’exécute correctement sur `main` |
| #23 | Restauration, en-têtes de sécurité et tests clients/fournisseurs — fusionnée | Contrôler la couverture et les preuves d’exécution |
| #24 | Audit documentaire — fusionnée | Vérifier que les documents correspondent à l’état actuel |
| #3 | Mise à jour de `actions/checkout` — ouverte au dernier relevé | Vérifier l’état actuel et la CI |
| #4 | Mise à jour de `actions/setup-node` — ouverte au dernier relevé | Vérifier l’état actuel et la CI |
| #5 | Groupe de mises à jour mineures et correctives — ouvert au dernier relevé | Examiner les versions et les changements |
| #7 | Mise à jour ESLint — ouverte au dernier relevé | Vérifier la compatibilité avec Next.js |

Les numéros et statuts des PR Dependabot doivent être actualisés à partir de GitHub avant de considérer cette section comme définitive.

---

## 9. Parcours fonctionnels à valider

Le socle technique doit permettre de développer les modules de gestion sans compromettre l’isolation des données.

### 9.1 Inscription et onboarding

- [ ] Inscription d’un utilisateur.
- [ ] Connexion et déconnexion.
- [ ] Gestion des sessions expirées.
- [ ] Gestion des comptes désactivés.
- [ ] Création d’une entreprise.
- [ ] Association d’un utilisateur à son entreprise.
- [ ] Attribution des rôles.
- [ ] Refus des accès non autorisés.

### 9.2 Gestion des clients et fournisseurs

- [ ] Création d’un client.
- [ ] Modification et consultation d’un client autorisé.
- [ ] Création d’un fournisseur.
- [ ] Modification et consultation d’un fournisseur autorisé.
- [ ] Validation des champs et gestion des erreurs.
- [ ] Isolation des données entre entreprises.
- [ ] Vérification des autorisations côté serveur.

### 9.3 Préparation des modules métier

Les modules suivants doivent pouvoir être ajoutés progressivement :

- Gestion des activités et projets.
- Gestion des budgets et dépenses.
- Gestion des employés et de la paie.
- Gestion des clients et fournisseurs.
- Gestion des documents et rapports.

La présence de ces modules dans la feuille de route ne signifie pas qu’ils sont tous implémentés ou validés.

---

## 10. Données personnelles, conformité et exploitation

Les points suivants nécessitent une décision explicite avant une mise en production destinée à des entreprises réelles :

- [ ] Définir les données personnelles collectées et leur finalité.
- [ ] Définir les durées de conservation.
- [ ] Définir les procédures de correction, export et suppression.
- [ ] Examiner les obligations légales applicables au Burkina Faso.
- [ ] Vérifier les éventuelles obligations ou formalités auprès de l’autorité compétente, notamment la CIL si applicable.
- [ ] Documenter la région d’hébergement et les transferts éventuels de données.
- [ ] Définir les accès du personnel technique et administratif.
- [ ] Définir une procédure de gestion des incidents.
- [ ] Définir les limites de création d’entreprises et les protections anti-abus.
- [ ] Définir les politiques de sauvegarde, de reprise et de continuité.
- [ ] Confirmer la licence logicielle et l’identité commerciale du produit.

Ces points doivent être évalués en fonction de l’usage réel, des données traitées et des services retenus.

---

## 11. Ordre de travail recommandé

### Priorité 1 — Vérifier l’état réel du dépôt

- [ ] Confirmer la branche courante et l’absence de changements involontaires.
- [ ] Vérifier les derniers commits et l’état de la CI.
- [ ] Actualiser le statut des pull requests.
- [ ] Relire les documents et les workflows fusionnés.

### Priorité 2 — Renforcer les validations techniques

- [ ] Relancer les contrôles locaux.
- [ ] Vérifier l’isolation multi-entreprises et les permissions.
- [ ] Contrôler le workflow de restauration.
- [ ] Examiner le rapport d’audit complet des dépendances.

### Priorité 3 — Valider l’environnement hébergé

- [ ] Identifier l’environnement cible.
- [ ] Préparer une sauvegarde et un plan de retour arrière.
- [ ] Valider les migrations et les politiques RLS dans un environnement non productif.
- [ ] Tester l’authentification et les parcours utilisateurs.
- [ ] Documenter les résultats.

### Priorité 4 — Décider des points de gouvernance

- [ ] Valider la matrice des rôles.
- [ ] Définir les politiques de données personnelles.
- [ ] Définir les objectifs de reprise.
- [ ] Vérifier les règles de protection GitHub.
- [ ] Décider de la licence, du nom commercial et des conditions de mise en production.

---

## 12. Critères de clôture de la Phase 1

La Phase 1 ne pourra être considérée comme terminée que lorsque les éléments critiques suivants seront démontrés :

- [ ] Le projet se construit sans erreur.
- [ ] Les contrôles de qualité et les tests passent.
- [ ] Les workflows GitHub requis sont réussis.
- [ ] Les migrations ont été validées dans un environnement contrôlé.
- [ ] L’isolation entre entreprises est vérifiée.
- [ ] Les rôles et permissions essentiels sont testés.
- [ ] La sauvegarde et la restauration sont démontrées.
- [ ] Les en-têtes HTTP sont vérifiés sur le déploiement.
- [ ] Les risques de dépendances sont corrigés ou formellement documentés.
- [ ] Les PR et mises à jour restantes sont traitées ou justifiées.
- [ ] Les décisions de sécurité, de conformité et d’exploitation nécessaires sont documentées.

Toute exception doit préciser le risque, son impact, la mesure temporaire retenue, le responsable et la prochaine date de révision.

---

## 13. Journal de validation

À compléter après chaque session de contrôle.

| Date | Contrôle | Résultat | Preuve / lien | Responsable |
|---|---|---|---|---|
| 23/10/2026 | Dernier état documentaire connu | À confirmer après remplacement | À renseigner | À renseigner |
| À compléter | Lint, typecheck et tests | À exécuter | À renseigner | À renseigner |
| À compléter | Build de production | À exécuter | À renseigner | À renseigner |
| À compléter | CI sur `main` | À vérifier | À renseigner | À renseigner |
| À compléter | Restauration de base de données | À vérifier | À renseigner | À renseigner |
| À compléter | Validation Supabase hébergée | En attente | À renseigner | À renseigner |

**Fin du document — Phase 1**
