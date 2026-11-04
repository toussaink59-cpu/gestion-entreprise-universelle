# Plateforme universelle de gestion d’entreprise

> > **Nom commercial : PolyGest** — plateforme de gestion intégrée destinée aux entrepreneurs et aux PME.

Plateforme web de gestion destinée aux entrepreneurs, indépendants, TPE et PME. Le projet vise à réunir dans un espace sécurisé les principales opérations d’une entreprise : ventes, facturation, dépenses, trésorerie, budgets, personnel, paie, stocks et rapports.

**Marché de départ :** Burkina Faso. **Ambition :** concevoir une base commune extensible à d’autres pays et secteurs d’activité.

## Statut réel du projet

**Phase actuelle : consolidation finale de la Phase 1 (fondation technique).** Le socle d’authentification, de gestion multi-entreprises, d’administration des membres et d’isolation des données a été renforcé et contrôlé sur les environnements de test. La Phase 1 reste toutefois ouverte : le dépôt ne doit pas être considéré comme un logiciel prêt pour la production.

Éléments présents dans le dépôt :

- une application Next.js / React / TypeScript avec inscription, connexion, déconnexion et création d’une première entreprise (authentification Supabase) ;
- un tableau de bord qui liste les entreprises de l’utilisateur connecté, avec accès aux répertoires clients et fournisseurs ;
- la gestion des membres par entreprise, avec invitations par e-mail sécurisées, jetons à usage unique et confirmation de l’adresse avant activation par le propriétaire ;
- un premier module métier : répertoires clients et fournisseurs, avec archivage, sans suppression définitive ;
- des migrations PostgreSQL : entreprises, profils, appartenances, rôles, permissions, invitations sécurisées, journal d’audit en ajout seul, clients et fournisseurs, avec RLS ;
- aucune limite fixe de cinq entreprises par propriétaire dans le MVP ; les quotas éventuels seront définis dans les futures formules d’abonnement ;
- des tests automatisés d’isolation entre entreprises, de permissions par rôle, de révocation et d’audit, exécutés sur les migrations ;
- des scripts de sauvegarde et de restauration, et un test de restauration de bout en bout avec données fictives ;
- une fondation de stockage documentaire privé en cours d'intégration : bucket privé, métadonnées isolées, contrôles hérités du module, dépôt direct signé et liens de téléchargement de 120 secondes ; les fichiers restent bloqués tant que l'analyse antivirus n'est pas branchée ;
- une CI GitHub Actions : lint, build, vérification TypeScript, tests, audit de toutes les dépendances (runtime et développement), ShellCheck, lint SQL et tests sur une pile Supabase locale réelle.

**Limites actuelles :** les modules devis, facturation, paiements, dépenses, trésorerie, budgets, stocks et paie n’existent pas encore. Les migrations n’ont pas encore été validées sur le projet Supabase hébergé, la matrice des rôles n’est pas validée par le porteur du projet, et l’hébergement, la région et la politique de sauvegarde ne sont pas décidés. Les scripts de sauvegarde ne remplacent pas un dispositif de sauvegarde opérationnel pour la production.

Le détail des constats vérifiés et des risques restants se trouve dans [l’audit Phase 1 du 4 novembre 2026](docs/PHASE1_AUDIT_2026-11-04.md). La [checklist historique](docs/PHASE1_CHECKLIST.md) conserve le relevé du 23 octobre et n’est pas la source de statut actuelle.

## Documents du projet

- [Cahier des charges PDF](docs/CAHIER_DES_CHARGES.pdf)
- [Feuille de route](docs/ROADMAP.md)
- [Architecture proposée](docs/ARCHITECTURE.md)
- [Modèle de données initial](docs/MODELE_DONNEES_INITIAL.md)
- [Audit de la Phase 1 — état vérifié du 4 novembre 2026](docs/PHASE1_AUDIT_2026-11-04.md)
- [Spécification du stockage privé des documents](docs/STOCKAGE_DOCUMENTS_PRIVES.md)
- [Checklist historique de la Phase 1](docs/PHASE1_CHECKLIST.md)
- [Design system PolyGest](docs/POLYGEST_DESIGN_SYSTEM.md)
- [Spécification fonctionnelle — Devis et factures](docs/SPECIFICATION_FONCTIONNELLE_DEVIS_FACTURES.md)
- [Modèle de données — Devis et factures](docs/MODELE_DONNEES_DEVIS_FACTURES.md)
- [Référentiel de conformité fiscale — Facturation au Burkina Faso](docs/CONFORMITE_FISCALE_BURKINA_FACTURATION.md)
- [Matrice fiscale de référence — Burkina Faso 2026](docs/MATRICE_FISCALE_BURKINA_2026.md)
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

La paie de base fait partie du MVP P0, mais sera développée après la fondation commerciale et financière et restera en simulation tant que les règles locales ne seront pas validées par un professionnel compétent. La comptabilité complète, les intégrations de paiement et les fonctions multi-pays sont des évolutions ultérieures.

## Sécurité et conformité

Aucune donnée réelle d’entreprise, de client ou de paie ne doit être utilisée tant que l’authentification, les contrôles d’accès, l’isolation multi-entreprises, les sauvegardes et les procédures d’exploitation n’ont pas été validés.

Le système devra respecter le cadre applicable au Burkina Faso, notamment les obligations comptables, fiscales, sociales et de protection des données. Les règles exactes, taux, plafonds, formulaires et obligations devront être vérifiés auprès de sources officielles et de professionnels habilités avant la mise en production. Ce projet ne remplace pas les conseils d’un comptable, d’un fiscaliste ou d’un spécialiste de la paie.

## Démarrage du développement

1. Terminer la consolidation de la Phase 1 ([audit vérifié](docs/PHASE1_AUDIT_2026-11-04.md)).
2. Valider le cahier des charges, le périmètre MVP et la matrice des rôles.
3. Finaliser l’authentification et l’intégration à la base dans un environnement de test.
4. Développer un premier flux métier complet, avec permissions et tests.
5. Valider l’exploitation, la restauration, la conformité et les contrôles de sécurité avant toute mise en production.

## Licence

La licence n’a pas encore été choisie. Clarifier la licence et les droits associés avant toute réutilisation ou redistribution du code à des fins de production.
