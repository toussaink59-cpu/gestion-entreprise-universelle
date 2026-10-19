# Architecture technique — proposition initiale

## 1. Vue d’ensemble

1. **Interface web responsive** : formulaires et tableaux de bord pour ordinateur et mobile.
2. **Couche applicative** : validation des entrées, règles métier, autorisations et orchestration.
3. **Base relationnelle** : PostgreSQL, avec clés étrangères, contraintes et transactions.
4. **Authentification** : fournisseur sécurisé ou solution maîtrisée ; les mots de passe ne sont jamais stockés en clair par l’application.
5. **Documents** : stockage privé, accès temporaire autorisé et validation du type/taille de fichier.
6. **Exploitation** : environnements distincts, logs, alertes, sauvegardes et restauration testée.

## 2. Technologies candidates

- Next.js et TypeScript pour l’application web.
- PostgreSQL pour la base relationnelle.
- Supabase comme option pour base de données, authentification et stockage.
- Tests unitaires, tests d’intégration et tests de bout en bout.
- Intégration continue pour lancer les contrôles sur chaque modification.

Cette liste est une décision proposée, pas une exigence irréversible. Les choix finaux doivent considérer coût, portabilité, maîtrise opérationnelle, résidence et traitement des données, exigences contractuelles et continuité de service.

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
