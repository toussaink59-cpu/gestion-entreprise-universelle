# Plateforme universelle de gestion d’entreprise

> **Nom commercial provisoire** — le nom définitif sera choisi après validation du positionnement et des vérifications de disponibilité.

Plateforme web de gestion destinée aux entrepreneurs, indépendants, TPE et PME. Le projet vise à réunir dans un espace sécurisé les principales opérations d’une entreprise : ventes, facturation, dépenses, trésorerie, budgets, personnel, paie, stocks et rapports.

**Marché de départ :** Burkina Faso. **Ambition :** concevoir une base commune extensible à d’autres pays et secteurs d’activité.

## Statut réel du projet

**Phase actuelle : consolidation de la fondation technique (Phase 1).** Le dépôt ne doit pas encore être considéré comme un logiciel prêt pour la production.

Éléments déjà présents dans le dépôt :

- une application Next.js / React / TypeScript avec une première interface de tableau de bord de démonstration ;
- une première migration PostgreSQL pour les entreprises, profils, appartenances, rôles, permissions, RLS et journal d’audit ;
- des tests automatisés d’isolation et de permissions, exécutés sur les migrations ;
- des scripts de sauvegarde, de restauration et un test de restauration de bout en bout avec données fictives ;
- une CI GitHub Actions qui exécute lint, build, vérification TypeScript, tests, audit des dépendances de production et ShellCheck.

**Limites actuelles :** le tableau de bord contient des données fictives écrites dans le code. Le parcours complet d’authentification dans l’interface n’est pas encore livré ; les modules clients, facturation, paiements, dépenses, trésorerie, stocks et paie ne sont pas encore des fonctionnalités métier complètes. Les scripts de sauvegarde ne remplacent pas la configuration d’un dispositif de sauvegarde opérationnel pour la production.

La liste des critères d’acceptation et des points restant à traiter se trouve dans [la checklist de consolidation de la Phase 1](docs/PHASE1_CHECKLIST.md).

## Documents du projet

- [Cahier des charges PDF](docs/CAHIER_DES_CHARGES.pdf)
- [Feuille de route](docs/ROADMAP.md)
- [Architecture proposée](docs/ARCHITECTURE.md)
- [Modèle de données initial](docs/MODELE_DONNEES_INITIAL.md)
- [Checklist Phase 1](docs/PHASE1_CHECKLIST.md)
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
- **Supabase** comme option pour PostgreSQL, l’authentification et le stockage privé ;
- une interface responsive ;
- des tests automatisés pour les règles métier, la paie, la trésorerie et l’isolation des entreprises.

Ces choix devront être confirmés selon les coûts, contraintes d’hébergement, exigences de conformité et besoins d’exploitation. Voir [l’architecture](docs/ARCHITECTURE.md) et [ADR-001](docs/adr/0001-socle-technique.md).

## Périmètre indicatif du MVP

Le premier incrément vise à permettre à une entreprise de :

- créer son espace et inviter des utilisateurs avec des rôles ;
- saisir clients et fournisseurs ;
- créer des devis et factures ;
- enregistrer encaissements et dépenses ;
- suivre quelques comptes de trésorerie et budgets ;
- consulter un tableau de bord réel et exporter des rapports de base.

Le module de paie réelle, la comptabilité complète, les intégrations de paiement et les fonctions multi-pays devront être validés spécifiquement avant d’être annoncés comme disponibles.

## Sécurité et conformité

Aucune donnée réelle d’entreprise, de client ou de paie ne doit être utilisée tant que l’authentification, les contrôles d’accès, l’isolation multi-entreprises, les sauvegardes et les procédures d’exploitation n’ont pas été validés.

Le système devra respecter le cadre applicable au Burkina Faso, notamment les obligations comptables, fiscales, sociales et de protection des données. Les règles exactes, taux, plafonds, formulaires et obligations devront être vérifiés auprès de sources officielles et de professionnels habilités avant la mise en production. Ce projet ne remplace pas les conseils d’un comptable, d’un fiscaliste ou d’un spécialiste de la paie.

## Démarrage du développement

1. Terminer la checklist de consolidation de la Phase 1.
2. Valider le cahier des charges, le périmètre MVP et la matrice des rôles.
3. Finaliser l’authentification et l’intégration à la base dans un environnement de test.
4. Développer un premier flux métier complet, avec permissions et tests.
5. Valider l’exploitation, la restauration, la conformité et les contrôles de sécurité avant toute mise en production.

## Licence

La licence n’a pas encore été choisie. Clarifier la licence et les droits associés avant toute réutilisation ou redistribution du code à des fins de production.
