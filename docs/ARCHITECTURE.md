# Architecture technique — proposition initiale

## 1. Vue d’ensemble

1. **Interface web responsive** : formulaires et tableaux de bord pour ordinateur et mobile.
2. **Couche applicative** : validation des entrées, règles métier, autorisations et orchestration.
3. **Base relationnelle** : PostgreSQL, avec clés étrangères, contraintes et transactions.
4. **Authentification** : fournisseur sécurisé ou solution maîtrisée ; les mots de passe ne sont jamais stockés en clair par l’application.
5. **Documents** : stockage privé, accès temporaire autorisé et validation du type/taille de fichier.
6. **Exploitation** : environnements distincts, logs, alertes, sauvegardes et restauration testée.

## 2. Socle technique en place et options d'évolution

- Next.js et TypeScript pour l’application web.
- PostgreSQL pour la base relationnelle.
- Supabase pour PostgreSQL géré, authentification et stockage privé dans l'architecture actuellement déployée.
- Tests unitaires, tests d’intégration et tests de bout en bout.
- Intégration continue pour lancer les contrôles sur chaque modification.

La stack actuellement utilisée est Next.js, React, TypeScript, PostgreSQL et Supabase. Toute évolution doit préserver portabilité SQL, RLS, coûts, maîtrise opérationnelle, résidence et traitement des données, exigences contractuelles et continuité de service.

## 3. Isolation multi-entreprises

- Toute table contenant des données appartenant à une entreprise doit être associée à un `company_id`/tenant explicite ou à une relation qui permet de vérifier l’appartenance.
- L’accès doit être refusé par défaut.
- Les vérifications doivent être appliquées côté serveur et, si retenu, au moyen de politiques PostgreSQL/RLS.
- Les contrôles d’interface ne constituent pas une mesure de sécurité suffisante.
- Tester les accès en lecture, création, modification, suppression, export et accès par identifiant direct entre deux entreprises de test.
- Les opérations administratives transversales doivent être rares, limitées, journalisées et contrôlées.

## 4. Transactions financières

- Utiliser des transactions de base de données lorsque plusieurs écritures doivent être atomiques.
- Stocker les montants en type décimal adapté ou en unités monétaires mineures, jamais en flottant binaire pour les calculs financiers.
- Conserver code devise et précision monétaire.
- Prévoir les références uniques pour prévenir les doubles soumissions.
- Après validation, corriger une opération sensible via un mécanisme tracé ou une contre-écriture, plutôt que la remplacer silencieusement.
- Conserver dates de création, de validation et d’annulation, utilisateur et motif lorsque nécessaire.

## 5. Paramètres réglementaires

Les taux, seuils et règles de paie/taxe/comptabilité doivent être configurables par pays, régime et date d’effet, avec une source de référence, une date de vérification et un responsable de validation. Les mises à jour réglementaires doivent faire l’objet de tests de non-régression.

## 6. Sécurité et exploitation

- Autorisations minimales par rôle et par entreprise.
- Secrets uniquement dans les variables d’environnement sécurisées ; aucun secret dans Git.
- Authentification renforcée pour les fonctions sensibles lorsque possible.
- Limitation de débit et validation des entrées.
- Stockage privé des documents et limitation des liens d’accès.
- Journaux sans secrets ni données personnelles inutiles.
- Sauvegardes automatiques, rétention définie et tests de restauration.
- Procédure de gestion des incidents, révocation d’accès et réponse à une fuite.

## 7. Environnements

Séparer développement, test/staging et production. Utiliser des données fictives ou anonymisées hors production. Aucun test ne doit dépendre de données réelles de paie ou de clients.

## 8. Décisions à trancher avant la mise en œuvre

- Hébergement, région et conditions de traitement des données.
- Authentification et gestion des organisations.
- Stratégie de pièces jointes et taille maximale.
- Service d’e-mail et notifications.
- Sauvegarde, rétention, restauration et continuité.
- Monnaie, multi-devises et fuseaux horaires.
- Choix des bibliothèques d’interface et de validation.
- Politique de versions API et migrations de schéma.


## 9. Internationalisation et architecture multi-pays

Cette section applique le cahier des charges v0.1 complété par l'avenant n°1 v0.2 et par [ADR-002](adr/0002-internationalisation-fr-en-multi-pays.md).

### 9.1 Séparation régionale
L'architecture distingue la langue utilisateur, le pays/juridiction de l'entreprise, la devise de référence, la devise d'un document lorsque le module le permet, le fuseau IANA et les règles fiscales/sociales/comptables applicables selon la période. Ces paramètres sont indépendants.

### 9.2 Routage et messages
- `next-intl` est la solution de référence, sous réserve de validation dans la version Next.js en place.
- Le français reste sans préfixe et l'anglais est exposé sous `/en` (`localePrefix: 'as-needed'`).
- Le routage est composé avec `src/proxy.ts`, qui gère déjà Supabase SSR ; un seul proxy préserve cookies, headers, redirections et sessions.
- Les catalogues FR/EN sont centralisés ; les erreurs métier utilisent des codes stables, présentés dans la langue de l'utilisateur.
- La préférence utilisateur est persistée après audit des privilèges et de RLS.

### 9.3 Données et formatage
- Pays : ISO 3166-1 alpha-2 ; devises : ISO 4217 ; fuseaux : IANA.
- Réutiliser `companies.country_code`, `default_currency` et `timezone` avant toute nouvelle migration.
- Les montants sont calculés en décimal exact en base ; `Intl.NumberFormat` sert à l'affichage seulement, avec locale et devise explicites.
- Les devises différentes ne sont pas additionnées sans conversion demandée, datée, sourcée et auditée.
- Les documents transmis/émis conservent langue, devise et snapshots nécessaires ; une préférence modifiée ne réécrit pas l'historique.

### 9.4 Adaptateurs nationaux et sécurité
Le noyau métier reste commun. Les règles de fiscalité, facturation légale, comptabilité, paie et protection des données sont isolées par juridiction, régime et date d'effet. Le Burkina Faso est le premier adaptateur de référence. Un nouveau pays n'est pas déclaré conforme avant vérification de sources officielles et validation professionnelle lorsque requise.

Le routage et les traductions ne changent ni les permissions, ni RLS, ni l'isolation multi-entreprises. Aucune migration destructive, réplication multi-région ou modification de région d'hébergement n'est autorisée par cette section ; les décisions de résidence restent soumises à l'ADR-001.
