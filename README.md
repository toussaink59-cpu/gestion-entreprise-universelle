# Plateforme universelle de gestion d’entreprise

> **Nom commercial provisoire** — le nom définitif sera choisi après validation du positionnement et des vérifications de disponibilité.

Plateforme web de gestion destinée aux entrepreneurs, indépendants, TPE et PME. Le projet vise à réunir dans un espace sécurisé les principales opérations d’une entreprise : ventes, facturation, dépenses, trésorerie, budgets, personnel, paie, stocks et rapports.

**Marché de départ :** Burkina Faso. **Ambition :** concevoir une base commune extensible à d’autres pays et secteurs d’activité.

## Statut du projet

**Phase actuelle : cadrage et spécification.** Le cahier des charges est en cours de préparation. Le dépôt constitue le point de départ documentaire du projet ; les fonctionnalités décrites ci-dessous ne sont pas présentées comme déjà développées.

- [Cahier des charges PDF](docs/CAHIER_DES_CHARGES.pdf)
- [Feuille de route](docs/ROADMAP.md)
- [Architecture proposée](docs/ARCHITECTURE.md)
- [Modèle de données initial](docs/MODELE_DONNEES_INITIAL.md)
- [Sécurité et confidentialité](SECURITY.md)
- [Contribution au projet](CONTRIBUTING.md)

## Problème à résoudre

De nombreux entrepreneurs gèrent encore les clients, factures, paiements, dépenses, budgets et dossiers du personnel dans des fichiers ou applications séparés. Cela peut rendre difficile la consolidation des chiffres, le suivi des échéances et la préparation de rapports cohérents.

Le projet cherche à proposer une plateforme cohérente, accessible et progressive, avec des fonctionnalités communes aux différents métiers et des modules optionnels selon l’activité.

## Vision et objectifs

1. Centraliser les informations et opérations de gestion d’une entreprise.
2. Aider le dirigeant à suivre les recettes, dépenses, créances, dettes et trésorerie.
3. Comparer les budgets prévisionnels aux opérations réellement enregistrées.
4. Simplifier la gestion administrative du personnel et la préparation de la paie.
5. Fournir des tableaux de bord et des rapports exportables.
6. Protéger strictement les données de chaque entreprise.
7. Adapter les paramètres comptables, fiscaux et sociaux au pays et au régime applicables.
8. Permettre l’utilisation sur ordinateur, tablette et smartphone.

## Utilisateurs visés

- Entrepreneurs et dirigeants de TPE/PME ;
- responsables administratifs et financiers ;
- comptables et gestionnaires de paie ;
- responsables RH ;
- responsables de ventes, achats, stocks ou projets ;
- collaborateurs disposant de droits limités ;
- administrateurs techniques de la plateforme, avec accès contrôlé et journalisé.

## Modules envisagés

| Module | Capacités cibles |
|---|---|
| Entreprise et administration | Profil, agences, exercices, paramètres et utilisateurs |
| Clients et fournisseurs | Contacts, historique, contrats, créances et dettes |
| Ventes et facturation | Devis, commandes, factures, avoirs, paiements et relances |
| Achats et dépenses | Achats, frais, justificatifs et approbations |
| Trésorerie | Caisses, banques, moyens de paiement et rapprochements |
| Budget et rentabilité | Prévisions, réalisations, écarts et indicateurs |
| Personnel et paie | Employés, contrats, absences, primes, retenues et bulletins |
| Produits et stocks | Catalogue, mouvements, inventaire et alertes |
| Projets et prestations | Tâches, responsables, délais, coûts et avancement |
| Comptabilité | Journaux, écritures et états selon le régime applicable |
| Équipements | Immobilisations, affectations et maintenance |
| Rapports et documents | Tableaux de bord, exports PDF/Excel et archivage |

Le MVP ne doit pas tout inclure dès le lancement. La priorisation proposée est décrite dans [la feuille de route](docs/ROADMAP.md).

## Principes structurants

- **Multi-entreprises :** chaque entreprise dispose d’un espace de données isolé.
- **Accès par rôle :** les droits sont attribués selon les responsabilités, et pas uniquement selon l’écran affiché.
- **Traçabilité :** les opérations financières validées doivent laisser une trace ; les corrections sensibles sont journalisées et, lorsque nécessaire, réalisées par contre-écriture.
- **Paramètres datés :** les règles de paie, taxes et comptabilité doivent être configurables par pays, période et régime, et vérifiées avant usage réel.
- **Confidentialité par défaut :** accès minimal, stockage privé des pièces sensibles, sauvegardes et tests de restauration.
- **Mobile-first pragmatique :** les tâches courantes doivent être utilisables sur un smartphone.
- **Internationalisation :** devise, langue, fuseau horaire et paramètres réglementaires ne doivent pas être figés dans le code métier.

## Architecture technique proposée

La proposition initiale est une application web fondée sur :

- **Next.js + TypeScript** pour l’application ;
- **PostgreSQL** pour les données relationnelles ;
- **Supabase** comme option de départ pour PostgreSQL, l’authentification et le stockage privé ;
- une interface responsive ;
- des tests automatisés pour les règles métier, la paie, la trésorerie et l’isolation des entreprises.

Ces choix sont proposés, mais devront être confirmés après étude des coûts, contraintes d’hébergement, exigences de conformité et besoins d’exploitation. Voir [l’architecture](docs/ARCHITECTURE.md).

## Périmètre indicatif du MVP

Le premier incrément vise à permettre à une entreprise de :

- créer son espace et inviter des utilisateurs avec des rôles ;
- enregistrer clients et fournisseurs ;
- saisir des devis et factures ;
- enregistrer encaissements et dépenses ;
- suivre quelques comptes de trésorerie et budgets ;
- consulter un tableau de bord et exporter des rapports de base.

Le module de paie réelle, la comptabilité complète, les intégrations de paiement et les fonctions multi-pays devront être validés spécifiquement avant d’être annoncés comme disponibles.

## Conformité et limites

Le système devra être conçu en tenant compte du cadre applicable au Burkina Faso, notamment des obligations comptables, fiscales, sociales et de protection des données. Les règles exactes, taux, plafonds, formulaires et obligations devront être vérifiés auprès de sources officielles et de professionnels habilités avant la mise en production. Ce projet ne remplace pas les conseils d’un comptable, d’un fiscaliste ou d’un spécialiste de la paie.

## Démarrage du développement

1. Valider le cahier des charges et le périmètre MVP.
2. Décider du nom définitif, du modèle économique et de la licence du dépôt.
3. Confirmer l’architecture et les environnements de développement/test/production.
4. Concevoir le schéma initial et les politiques d’isolation multi-entreprises.
5. Réaliser les premiers tests de sécurité avant de saisir des données réelles.

## Statut des versions

Le dépôt est actuellement documentaire. Aucun engagement de disponibilité, de conformité certifiée ou de fonctionnalité en production n’est sous-entendu.

## Licence

La licence n’a pas encore été choisie. Ne pas réutiliser ou redistribuer le code à des fins de production avant clarification de la licence et des droits associés.
