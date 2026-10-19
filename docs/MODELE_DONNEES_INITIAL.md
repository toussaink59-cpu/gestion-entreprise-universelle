# Modèle initial de données

Ce document donne une première liste d’entités. Il ne constitue pas encore un schéma SQL prêt pour production. Les cardinalités, contraintes, règles de suppression, index, champs obligatoires et exigences d’audit doivent être précisés lors de la conception détaillée.

## Identité et accès

- `companies` : entreprise, nom légal/commercial, pays, devise par défaut, fuseau horaire, paramètres et statut.
- `users` : identité applicative et état du compte ; l’authentification peut être déléguée à un fournisseur.
- `company_memberships` : lien utilisateur-entreprise, statut et rôle.
- `roles` / `permissions` : rôles prédéfinis et droits précis, selon la stratégie retenue.
- `audit_events` : acteur, entreprise, action, entité visée, horodatage et métadonnées filtrées.

## Référentiels commerciaux

- `customers` : clients et coordonnées.
- `suppliers` : fournisseurs et conditions commerciales.
- `products_services` : articles, prestations, unités et tarifs.
- `quotes` / `quote_lines` : devis et lignes détaillées.
- `invoices` / `invoice_lines` : factures, échéances et lignes.
- `payments` : règlements reçus ou émis, méthode, date, référence et statut.
- `credit_notes` : avoirs et corrections commerciales.

## Dépenses, trésorerie et budgets

- `expense_categories` : catégories de charges.
- `expenses` : dépenses, fournisseur éventuel, date, montant, devise, justificatif et validation.
- `cash_accounts` : caisse, banque ou autre compte de trésorerie.
- `cash_transactions` : entrées/sorties et référence au document source.
- `budgets` / `budget_lines` : période, catégorie, montant prévu et éventuelles dimensions analytiques.
- `projects` : projet ou centre de coûts facultatif.

## Personnel et paie

- `employees` : fiche de personnel et rattachement à l’entreprise.
- `employment_contracts` : contrat, dates, type et composantes prévues de rémunération.
- `pay_periods` : périodes de paie.
- `payroll_runs` : calcul global, statut et validation.
- `payslips` : résultats individuels de paie.
- `pay_components` : éléments de salaire et retenues.
- `payroll_rule_sets` : paramètres par pays/régime/date d’effet, source et validation.

Les données de paie sont particulièrement sensibles et nécessitent des droits séparés, une journalisation appropriée et des tests renforcés.

## Stocks et équipements (extensions)

- `warehouses` : dépôts ou emplacements.
- `stock_movements` : article, quantité, unité, lieu, sens, référence source et acteur.
- `inventory_counts` : résultats d’inventaire et écarts.
- `assets` / `asset_maintenance` : immobilisations, affectation et maintenance.

## Documents

- `documents` : métadonnées, type, emplacement privé, taille, empreinte et lien vers l’entité métier.
- Le binaire d’un document ne devrait pas être accessible publiquement par défaut.

## Règles de conception

1. Définir clairement l’entreprise propriétaire (`company_id`) de chaque donnée métier.
2. Utiliser des clés primaires stables et des clés étrangères ; ajouter des contraintes d’unicité adaptées.
3. Conserver les montants avec précision décimale et un code devise.
4. Ne pas confondre date de création, date opérationnelle, échéance et date de validation.
5. Définir les statuts autorisés et les transitions entre statuts.
6. Définir les règles d’archivage, de conservation et de suppression.
7. Prévoir migrations versionnées et tests des contraintes.
8. Ne pas faire de l’historique d’audit un journal contenant inutilement des mots de passe, tokens, pièces d’identité ou données sensibles.
