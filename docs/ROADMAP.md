# Feuille de route PolyGest

**Référence fonctionnelle :** cahier des charges v0.1 du 19 octobre 2026, complété par les avenants n°1 v0.2 (5 novembre 2026) et n°2 v0.3 (19 novembre 2026).  
**Mise à jour :** 19 novembre 2026.

Cette feuille de route traduit le cahier des charges applicable (v0.1 + avenant v0.2) en phases de réalisation. En cas de divergence, le cahier des charges consolidé prévaut. Toute évolution du périmètre doit être documentée et approuvée dans une nouvelle version ou un nouvel avenant.

Une priorité **P0** signifie qu’une capacité appartient au MVP ; elle ne signifie pas qu’elle doit être développée avant les fondations techniques. Les phases organisent l’ordre de réalisation, tandis que les priorités définissent le périmètre de livraison.

## 1. État documentaire du projet

D’après les éléments de suivi actuellement consignés dans le dépôt :

- **Phase 0 — Cadrage :** cahier des charges v0.1 complété par l’avenant international v0.2 ; la région d'hébergement et les marchés réglementaires ultérieurs restent à arbitrer.
- **Phase 1 — Fondation :** clôturée le 9 novembre 2026 comme socle technique accepté. Les parcours principaux ont été vérifiés par le propriétaire en production ; la CI requise et le déploiement de référence sont documentés ; la branche `main` est protégée avec les deux contrôles obligatoires. La base Production est saine et ses migrations de Phase 1 sont synchronisées. La clôture conserve des réserves explicites : pas de scanner antivirus (documents toujours fermés), pas d’environnement de préproduction autonome, RPO/RTO à formaliser, avertissements Supabase à suivre et protection native des mots de passe compromis indisponible sur l’offre Free.
- **Phase 2 — Gestion quotidienne :** ouverte le 9 novembre 2026 et toujours en cours. Les évolutions Contacts #131, dépendances #132 et interface responsive Factures #133 sont fusionnées ; le commit `main` observé le 19 novembre est `72d9ce5` (la PR #134, purement documentaire, a été fusionnée ensuite). La fondation Factures brouillons `20261109161232` est indiquée comme appliquée sur les projets hébergés (à reconfirmer par un relevé de l'historique de chaque projet). En DEV, les migrations `20261116142111_invoice_quantity_finite_check` et `20261116203000_devis_annulation_accepte` ont été appliquées et vérifiées. Le 19 novembre, le propriétaire a validé le parcours fonctionnel DEV d'abandon d'un brouillon de facture issu d'un devis, puis d'annulation du devis accepté ; les statuts et événements d'audit ont été contrôlés en lecture seule. Ces deux migrations complémentaires restent à appliquer en Production après sauvegarde vérifiée, dry-run ciblé, plan de retour arrière et autorisation distincte. Le module Factures reste fermé en Production. L'éditeur tabulaire type Excel et le BPU réutilisable deviennent une condition P0 obligatoire avant mise en service ; dépenses détaillées multi-lignes, règlements, trésorerie, budgets, exports et autres capacités restent à réaliser ou valider selon les critères d'acceptation.
- **Phase 3 — Personnel et paie de base :** non déclarée terminée ; elle fait partie du MVP P0.
- **Phases 4 et suivantes :** extensions et stabilisation selon les priorités du cahier des charges.

Cet état est un relevé actualisé au 19 novembre 2026 à partir des contrôles du dépôt, des vérifications DEV et des contrôles en lecture seule. Les statuts « code fusionné », « déployé », « migration appliquée », « testé », « validé » et « disponible en production » restent distincts. Chaque nouveau statut Phase 2 doit rester relié à des résultats vérifiables.

## 2. Phase 0 — Cadrage et décisions

- Confirmer le périmètre MVP, les utilisateurs cibles et les rôles.
- Consigner le nom commercial, la licence et le modèle économique retenus.
- Arbitrer les décisions ouvertes relatives à l’hébergement, à la région, aux données personnelles et aux accès administratifs.
- Définir les exigences réglementaires à faire vérifier par des professionnels compétents au Burkina Faso.
- Définir la politique de sauvegarde, les objectifs RPO/RTO et la procédure d’incident.
- Transformer les exigences identifiées dans le cahier des charges en backlog traçable.

**Livrable :** cadrage versionné, décisions consignées, backlog priorisé et critères d’acceptation.

## 3. Phase 1 — Fondation technique et multi-entreprises — clôturée le 9 novembre 2026

- Stabiliser l’application Next.js / TypeScript et les environnements développement, préproduction et production.
- Mettre en place l’authentification, les profils, la création d’entreprise et l’invitation des membres.
- Formaliser les rôles et permissions par entreprise, module et action.
- Garantir l’isolation des données par entreprise côté serveur et au niveau de la base de données (RLS lorsque retenu).
- Mettre en place le journal d’audit des actions sensibles.
- Vérifier les migrations sur une base neuve et dans un environnement non productif.
- Sécuriser les fichiers privés, les secrets et les configurations.
- Vérifier la CI, les dépendances et les procédures de sauvegarde/restauration.

**Critères de sortie atteints pour la clôture de la fondation :** matrice d’accès et isolation interentreprises couvertes par les tests de base ; CI requise vérifiée ; branche `main` protégée ; sauvegarde/restauration de référence testée en environnement isolé ; application Production vérifiée manuellement par le propriétaire. Cette clôture n’emporte pas validation fiscale, certification de conformité exhaustive ou validation de tous les modules futurs. Les réserves et preuves sont listées dans [le procès-verbal de clôture du 9 novembre 2026](PHASE1_CLOTURE_2026-11-09.md). Aucune migration Phase 2 ne doit être appliquée en Production sans sauvegarde, plan de retour arrière et validation de l’environnement cible.

### 3.1 Chantier transversal — internationalisation FR/EN

Ce chantier s'ajoute à la fondation, sans remplacer les contrôles de sécurité ou les priorités métier existantes.

**État au 6 novembre 2026 :** ADR-002, le socle `next-intl`, la préférence linguistique persistante, le proxy combiné à Supabase SSR et les catalogues FR/EN sont intégrés. Les parcours actuellement livrés et traduits couvrent l'authentification, la récupération du mot de passe, l'onboarding, le tableau de bord, les clients/fournisseurs, les devis, les dépenses, la gestion des membres et des entreprises ainsi que l'acceptation des invitations. Les PRs #87, #88, #91, #92 et #95 à #103 constituent les principaux lots de cette livraison.

**Poursuite du chantier :**
- Maintenir la parité des catalogues FR/EN pour chaque nouvelle page, état de chargement, état vide, succès, erreur et refus de permission.
- Localiser les e-mails et notifications lorsqu'ils sont ajoutés ou étendus.
- Étendre les formatters localisés à chaque nouveau module, en gardant séparés langue, devise, pays légal et fuseau horaire.
- Compléter les tests automatisés de routes, sessions, invitations, permissions, accessibilité et isolation pour les deux langues.
- Vérifier les parcours de bout en bout sur les environnements hébergés avant d'activer de nouvelles routes ou fonctionnalités.

**Critères de sortie :** les routes françaises restent compatibles ; les parcours localisés disposent d'une préférence FR/EN persistante et d'un proxy Supabase SSR fonctionnel ; les catalogues sont complets pour chaque module effectivement livré ; le formatage et les tests sont vérifiés pour les deux langues. La parité des futurs modules reste obligatoire à mesure de leur développement.

### 3.2 Paramètres régionaux

Réutiliser et auditer `companies.country_code`, `companies.default_currency` et `companies.timezone`. Utiliser ISO 3166-1 alpha-2, ISO 4217 et IANA. Les montants restent décimaux en base. Ne jamais additionner des devises différentes sans conversion documentée, datée et traçable.

## 4. Phase 2 — Gestion commerciale et financière quotidienne (MVP P0)

### 4.1 État du lot — factures brouillons et annulation des devis acceptés

Le code de la tranche Factures brouillons est présent et inclut la liste, la création autonome ou depuis un devis accepté, la consultation, la modification des brouillons autonomes et l'abandon d'un brouillon. La migration de base `20261109161232_factures_brouillons.sql` est indiquée comme appliquée sur les projets hébergés (à reconfirmer par un relevé de l'historique de chaque projet).

Les contrôles du 19 novembre 2026 ont confirmé sur DEV :
- migration `20261116142111_invoice_quantity_finite_check` appliquée ;
- migration `20261116203000_devis_annulation_accepte` appliquée ; fonction `public.cancel_quote` vérifiée pour les statuts `sent` et `accepted`, l'exigence d'un motif et la traçabilité du statut antérieur ;
- test fonctionnel du devis de démonstration `D-2026-0001` : le brouillon de facture associé a été abandonné (statut `abandoned_draft`), puis le devis accepté a été annulé (statut `cancelled`) ; les motifs et événements `invoices.draft_abandoned` et `quotes.cancelled` ont été vérifiés dans le journal d'audit.

Ces résultats valident le scénario testé sur DEV, pas l'ensemble du module Factures ni une émission légale. Les deux migrations complémentaires du 16 novembre ne sont pas encore appliquées sur Production. Le code applicatif du commit `72d9ce5` est déployé sur Vercel Production en état `READY`, mais le module Factures doit rester fermé tant que `POLYGEST_INVOICES_ENABLED` n'est pas activé après décision de mise en service. Aucun contrôle DEV n'autorise implicitement une opération en Production.

**Avant toute application Production :** vérifier une sauvegarde récente/restaurable, exécuter un dry-run qui liste exactement les deux migrations attendues, confirmer l'environnement et le projet cible, préparer le retour arrière, puis obtenir l'autorisation explicite. Ne pas appliquer d'autres migrations dans cette opération.

**Périmètre effectivement testé :** brouillon non émis, abandon conservant le document et son motif, annulation motivée d'un devis accepté et audit. Numérotation légale, taxes/TVA, snapshots fiscaux, émission, certification, paiements, acomptes, factures de situation et avoirs/corrections restent hors de cette validation et nécessitent des lots et validations distincts.

### 4.2 Sous-chantier obligatoire avant mise en service — éditeur tabulaire et BPU

L'avenant n°2 v0.3 introduit une exigence P0 : la construction des devis, factures et dépenses doit offrir une expérience fluide inspirée d'Excel, et le BPU doit devenir un référentiel de prix réutilisable. Ce sous-chantier est une **condition obligatoire de sortie du MVP avant mise en service officielle**.

Le périmètre à réaliser comprend :
- éditeur de lignes commun, adapté à chaque document : désignation, unité, quantité, prix unitaire, remises et taxes autorisées, total de ligne ;
- ajout, insertion, duplication, suppression et réorganisation de lignes ;
- saisie au clavier, collage multi-cellules depuis un tableur et aperçu/validation avant import ;
- calculs immédiats côté interface, recalculs et validations autoritaires côté serveur ;
- BPU par entreprise avec codes, désignations, catégories, unités, prix, devise, dates/états, recherche et droits ;
- sélection d'éléments BPU dans les documents sans modification rétroactive des documents historiques ;
- import/export contrôlé CSV/XLSX et génération PDF des documents selon leur statut ;
- expérience responsive ordinateur/tablette/mobile et parité FR/EN ;
- contrôles de permissions, RLS, isolation interentreprises et audit sur les opérations sensibles.

**Critères de sortie :** critères TAB-01 à TAB-18 de l'avenant v0.3 testés ; totaux rapprochés d'un tableur de référence ; collage/import avec aperçu et erreurs contrôlées ; BPU réutilisable sans altération rétroactive ; tests clavier, mobile, FR/EN, permissions et audit réussis ; validation manuelle du propriétaire. Les limites de volume et la liste finale des colonnes doivent être fixées pendant la conception détaillée.

### 4.3 Périmètre métier restant de la Phase 2

- Répertoires clients et fournisseurs, historique et qualité des données.
- Devis, lignes de devis, acceptation/refus, annulation motivée et conversion en facture.
- Factures brouillons, puis émission et règles de numérotation/fiscalité uniquement après validations séparées.
- Bordereau de prix unitaires et bibliothèque de prix réutilisable.
- Dépenses détaillées multi-lignes, justificatifs, catégories et processus de validation.
- Enregistrement d'un ou plusieurs règlements par facture et calcul du solde restant.
- Caisses et comptes de trésorerie manuels ; encaissements, décaissements et transferts internes.
- Budgets par période/catégorie et comparaison prévu, engagé et payé.
- Tableau de bord initial distinguant chiffre d'affaires facturé, encaissements, dépenses payées, créances, dettes et trésorerie.
- Exports PDF et CSV/XLSX soumis aux autorisations et à la journalisation.
- Documents privés liés à l'entreprise et à leur objet métier.

**Critères de sortie de la Phase 2 :** parcours vente-paiement et dépense-budget testés de bout en bout ; montants exacts ; absence de double comptage des transferts ; statuts cohérents ; historique, imports et exports contrôlés ; éditeur tabulaire et BPU conformes à l'avenant v0.3. Les fonctionnalités fiscales réelles restent désactivées jusqu'à validation réglementaire compétente.

## 5. Phase 3 — Personnel et paie de base (MVP P0)

La paie de base est explicitement incluse dans le MVP du cahier des charges. Son développement intervient après le socle commercial et financier, mais elle ne doit pas être reclassée en P2.

- Dossiers employés et données professionnelles minimales.
- Contrats et éléments fixes/variables de rémunération.
- Périodes de paie, avances, absences, congés, primes et retenues selon les règles validées.
- Paramètres de paie versionnés par pays, régime et date d’effet.
- Calcul en brouillon, contrôles, validation distincte et verrouillage de période.
- Bulletins et récapitulatifs après validation des règles locales.
- Permissions RH strictes et journalisation des consultations/exports sensibles.

**Critères de sortie :** jeux de test chiffrés validés par un professionnel compétent au Burkina Faso ; historique des paramètres conservé ; aucun calcul réel présenté comme conforme avant validation. En l’absence de validation, la fonction reste en simulation ou indisponible pour la paie réelle.

## 6. Phase 4 — Stabilisation et validation du MVP

- Exécuter les tests unitaires, d’intégration, de bout en bout, de permissions et d’isolation.
- Tester les parcours clés sur ordinateur et smartphone.
- Vérifier les exports, les fichiers privés et les journaux d’audit.
- Exécuter et documenter une restauration depuis une sauvegarde en environnement isolé.
- Traiter les vulnérabilités et anomalies bloquantes.
- Préparer le manuel utilisateur, le guide administrateur et les procédures d’incident.
- Produire un procès-verbal de validation du MVP et une liste explicite des risques résiduels.

**Critère de sortie :** critères ACC-01 à ACC-09 du cahier des charges vérifiés, aucune anomalie bloquante non acceptée et résultats de tests conservés.

## 7. Phase 5 — Évolutions P1

- Stocks : catalogue, dépôts, entrées, sorties, retours, transferts et inventaires.
- Achats avancés et suivi des livraisons.
- Projets, activités, tâches, temps de travail, budgets et coûts réels.
- Équipements, affectations et maintenance.
- Alertes d’échéance, rapports avancés, modèles de documents et import contrôlé par fichier.

Ces modules sont développés après le MVP, selon les besoins confirmés et avec leurs exigences d’accès, d’audit et de tests.

## 8. Phase 6 — Évolutions P2 et préparation commerciale

- Comptabilité complète selon le régime et le référentiel applicables, après validation professionnelle.
- Intégrations bancaires et Mobile Money, uniquement après validation des API, contrats, exigences KYC et coûts.
- Adaptateurs réglementaires pour de nouveaux pays et conversions multi-devises avancées, après validation des règles et des marchés. L'internationalisation FR/EN du noyau est transversale et n'est pas reportée à cette phase.
- Application mobile native, mode hors ligne et API partenaires.
- Abonnements, limites configurables par formule, facturation du service et mécanismes anti-abus. Aucun plafond fixe arbitraire de création d’entreprise n’est appliqué au MVP ; les quotas éventuels seront définis avec les offres et appliqués selon une politique versionnée.
- Observabilité, support, tests de charge, pilote et procédures d’exploitation.

Aucune intégration ne doit être présentée comme disponible avant vérification de son fonctionnement réel et des conditions du prestataire.

## 9. Priorités officielles du MVP

| Priorité | Capacités selon le cahier des charges |
|---|---|
| **P0 — indispensable** | Création d’entreprise, authentification, rôles, clients/fournisseurs, devis et factures, éditeur tabulaire type Excel pour devis/factures/dépenses, BPU réutilisable, dépenses détaillées, règlements, caisses/comptes manuels, budgets, tableau de bord de base, imports/exports et journal d’audit |
| **P0 — paie de base** | Dossiers employés, éléments de rémunération, périodes, avances/retenues, simulation et bulletin après validation des règles locales |
| **P1 — évolution proche** | Stocks, achats avancés, projets, alertes d’échéance, rapports avancés, modèles de documents et import contrôlé |
| **P2 — évolution future** | Comptabilité complète, intégrations bancaires/Mobile Money, adaptateurs réglementaires multi-pays et conversions multi-devises avancées, application mobile native, mode hors ligne et API partenaires |

Les priorités métier P0/P1/P2 reprennent le cahier des charges v0.1, complété par les avenants v0.2 et v0.3. L'avenant v0.3 précise que l'éditeur tabulaire des devis/factures/dépenses et le BPU sont des conditions P0 obligatoires avant la mise en service. Le chantier i18n FR/EN reste transversal.

## 10. Règles de livraison et de gouvernance

- Une exigence fonctionnelle doit être reliée à une issue, un test et un critère d’acceptation.
- Une fonctionnalité n’est terminée que si le code est relu, les tests requis passent, les permissions sont vérifiées et la documentation est à jour.
- Les branches de fonctionnalité/correction sont fusionnées par Pull Request après CI et revue.
- Les migrations sont versionnées, relisibles et testées sur une base neuve et un environnement non productif.
- Aucune donnée réelle de paie ou de client n’est utilisée dans les tests ou démonstrations.
- Les règles fiscales, sociales et comptables sont versionnées, sourcées et validées avant activation.
- Les décisions ouvertes, anomalies et risques résiduels sont maintenus dans le registre du projet.

**Référence de priorité :** cahier des charges v0.1 (sections 03, 13 et 14), avenant n°1 v0.2 et avenant n°2 v0.3. En cas de divergence, le document consolidé prévaut dans son champ d'application.
