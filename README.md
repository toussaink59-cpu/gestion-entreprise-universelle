# Plateforme universelle de gestion d’entreprise

> **Nom commercial : PolyGest** — plateforme de gestion intégrée destinée aux entrepreneurs et aux PME.

Plateforme web de gestion destinée aux entrepreneurs, indépendants, TPE et PME. Le projet vise à réunir dans un espace sécurisé les principales opérations d’une entreprise : ventes, facturation, dépenses, trésorerie, budgets, personnel, paie, stocks et rapports.

**Marché de référence initial :** Burkina Faso. **Ambition produit :** logiciel international dès sa conception, avec une interface française et anglaise dès le départ, un noyau métier commun et des adaptateurs réglementaires ajoutés pays par pays.

## Statut réel du projet

**Phase actuelle : consolidation finale de la Phase 1 (fondation technique).** Le socle d’authentification, de gestion multi-entreprises, d’administration des membres et d’isolation des données a été renforcé et contrôlé sur les environnements de test. La Phase 1 reste toutefois ouverte : le dépôt ne doit pas être considéré comme un logiciel prêt pour la production.

Éléments présents dans le dépôt :

- une application Next.js / React / TypeScript avec inscription, connexion, déconnexion et création d’une première entreprise (authentification Supabase) ;
- un socle d’internationalisation FR/EN avec préférence linguistique persistante et traductions des parcours actuellement livrés : authentification, récupération du mot de passe, onboarding, tableau de bord, clients/fournisseurs, devis, dépenses, membres, entreprises et acceptation des invitations ;
- un tableau de bord qui liste les entreprises de l’utilisateur connecté, avec accès aux répertoires clients et fournisseurs ;
- la gestion des membres par entreprise, avec invitations par e-mail sécurisées, jetons à usage unique et confirmation de l’adresse avant activation par le propriétaire ;
- un premier module métier : répertoires clients et fournisseurs, avec archivage, sans suppression définitive ;
- des migrations PostgreSQL : entreprises, profils, appartenances, rôles, permissions, invitations sécurisées, journal d’audit en ajout seul, clients et fournisseurs, avec RLS ;
- `supabase/migrations/` est le chemin déployé par `supabase db push`. Il contient la fondation Phase 1 ainsi que les premiers lots Phase 2 livrés avant l’isolation (devis : brouillons, transmission, réponse client, valeurs finies ; dépenses brouillons), conservés pour ne pas altérer l’historique de migrations déjà appliqué en développement. Depuis les factures brouillons, toute nouvelle évolution Phase 2 est placée dans `supabase/phase2-migrations/`, testée sur bases jetables et exclue du déploiement tant qu’elle n’est pas promue ;
- aucune limite fixe de cinq entreprises par propriétaire dans le MVP ; les quotas éventuels seront définis dans les futures formules d’abonnement ;
- des tests automatisés d’isolation entre entreprises, de permissions par rôle, de révocation et d’audit, exécutés sur les migrations ;
- des scripts de sauvegarde et de restauration, et un test de restauration de bout en bout avec données fictives ;
- un socle de stockage documentaire privé livré et intégré aux fiches clients/fournisseurs : bucket privé, métadonnées isolées, permissions héritées du module, dépôt direct signé et liens de téléchargement de 120 secondes ; le dépôt reste désactivé par défaut (`DOCUMENT_SCANNER_ENABLED=false`) tant que le scanner antivirus n'est pas branché ;
- un premier flux de devis : brouillons, transmission avec numérotation interne provisoire `D-AAAA-NNNN`, réponse client (acceptation/refus) et annulation d’un devis transmis non répondu ; ce numéro reste distinct d’un numéro légal de facture et ne constitue aucune certification fiscale ;
- une première fondation de factures brouillons côté serveur : création autonome ou à partir d’un devis accepté, avec abandon traçable ; aucune interface de facturation n’est encore livrée ;
- les dépenses sont encore limitées aux brouillons ;
- une CI GitHub Actions : lint, build, vérification TypeScript, tests, audit de toutes les dépendances (runtime et développement), ShellCheck, lint SQL et tests sur une pile Supabase locale réelle.

**Limites actuelles :** les devis peuvent être préparés, transmis, acceptés/refusés et annulés dans les limites du module actuel. Les factures existent uniquement au stade de brouillon côté serveur : aucune interface dédiée, numérotation légale, taxe, émission ou règlement n’est encore disponible. Les dépenses restent limitées aux brouillons. Les paiements, la trésorerie, les budgets, les stocks et la paie ne sont pas encore implémentés. Le socle d’internationalisation FR/EN et les traductions des parcours existants sont intégrés ; les nouvelles fonctionnalités devront conserver cette parité linguistique. Le scanner antivirus n’est pas intégré et les dépôts documentaires restent désactivés par défaut (`DOCUMENT_SCANNER_ENABLED=false`). Les migrations, paramètres Auth, Storage et secrets n’ont pas été validés sur un projet Supabase hébergé ; la région, la politique opérationnelle de sauvegarde et les objectifs RPO/RTO restent à formaliser. Les scripts et tests de sauvegarde/restauration ne remplacent pas un dispositif opérationnel de production.

Le détail des constats vérifiés et des risques restants se trouve dans [l’audit Phase 1 du 6 novembre 2026](docs/PHASE1_AUDIT_2026-11-06.md). L’[audit du 4 novembre 2026](docs/PHASE1_AUDIT_2026-11-04.md) et la [checklist historique](docs/PHASE1_CHECKLIST.md) sont conservés comme archives.

## Documents du projet

- [Cahier des charges initial v0.1 (PDF)](docs/CAHIER_DES_CHARGES.pdf)
- [Avenant n°1 v0.2 — Internationalisation et architecture multi-pays](docs/CAHIER_DES_CHARGES_AVENANT_INTERNATIONAL_V0.2.md)
- [ADR-002 — Internationalisation FR/EN et architecture multi-pays](docs/adr/0002-internationalisation-fr-en-multi-pays.md)
- [Feuille de route](docs/ROADMAP.md)
- [Architecture proposée](docs/ARCHITECTURE.md)
- [Modèle de données initial](docs/MODELE_DONNEES_INITIAL.md)
- [Audit de la Phase 1 — état vérifié du 6 novembre 2026](docs/PHASE1_AUDIT_2026-11-06.md)
- [Audit historique de la Phase 1 — 4 novembre 2026](docs/PHASE1_AUDIT_2026-11-04.md)
- [Audit de préparation commerciale — état initial du 4 novembre 2026](docs/PHASE2_COMMERCIAL_READINESS_AUDIT_2026-11-04.md)
- [Spécification du stockage privé des documents](docs/STOCKAGE_DOCUMENTS_PRIVES.md)
- [Checklist historique de la Phase 1](docs/PHASE1_CHECKLIST.md)
- [Design system PolyGest](docs/POLYGEST_DESIGN_SYSTEM.md)
- [Norme frontend, sécurité et confidentialité](docs/FRONTEND_SECURITY_STANDARD.md)
- [Skill frontend PolyGest](skills/chatgpt-5-4-frontend-skill/README.md)
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
- **Internationalisation :** PolyGest est international dès sa conception ; les langues initiales sont le français et l’anglais. Langue utilisateur, pays légal, devise, fuseau horaire et paramètres réglementaires restent indépendants et ne sont jamais déduits les uns des autres.

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

La paie de base fait partie du MVP P0, mais sera développée après la fondation commerciale et financière et restera en simulation tant que les règles locales ne seront pas validées par un professionnel compétent. L’internationalisation de l’interface FR/EN et les fondations régionales sont transversales et doivent être préparées tôt ; les adaptateurs réglementaires de nouveaux pays, la comptabilité complète, les conversions de devises avancées et les intégrations de paiement restent des évolutions progressives.

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
