# Feuille de route PolyGest

**Référence fonctionnelle :** cahier des charges v0.1 du 19 octobre 2026, complété par l’avenant n°1 v0.2 du 5 novembre 2026.  
**Mise à jour :** 5 novembre 2026.

Cette feuille de route traduit le cahier des charges applicable (v0.1 + avenant v0.2) en phases de réalisation. En cas de divergence, le cahier des charges consolidé prévaut. Toute évolution du périmètre doit être documentée et approuvée dans une nouvelle version ou un nouvel avenant.

Une priorité **P0** signifie qu’une capacité appartient au MVP ; elle ne signifie pas qu’elle doit être développée avant les fondations techniques. Les phases organisent l’ordre de réalisation, tandis que les priorités définissent le périmètre de livraison.

## 1. État documentaire du projet

D’après les éléments de suivi actuellement consignés dans le dépôt :

- **Phase 0 — Cadrage :** cahier des charges v0.1 complété par l’avenant international v0.2 ; la région d'hébergement et les marchés réglementaires ultérieurs restent à arbitrer.
- **Phase 1 — Fondation :** en cours d’audit et de consolidation ; elle ne doit pas être déclarée terminée sans preuves récentes des contrôles, tests et restaurations. Les fondations i18n FR/EN sont un chantier transversal à engager tôt.
- **Phase 2 — Gestion quotidienne :** répertoires clients/fournisseurs et premier flux de devis présents ; les devis permettent désormais transmission, réponse client et annulation contrôlée. Les factures existent au stade brouillon uniquement (autonomes ou issues d’un devis accepté, sans numéro, taxe ni émission, en attente de validation fiscale). Factures, règlements, dépenses validées, trésorerie, budgets et exports restent à réaliser ou à valider selon l’état réel du code.
- **Phase 3 — Personnel et paie de base :** non déclarée terminée ; elle fait partie du MVP P0.
- **Phases 4 et suivantes :** extensions et stabilisation selon les priorités du cahier des charges.

Cet état est un relevé documentaire, pas une nouvelle preuve d’exécution des workflows ou des tests. Chaque statut devra être actualisé à partir de résultats vérifiables.

## 2. Phase 0 — Cadrage et décisions

- Confirmer le périmètre MVP, les utilisateurs cibles et les rôles.
- Consigner le nom commercial, la licence et le modèle économique retenus.
- Arbitrer les décisions ouvertes relatives à l’hébergement, à la région, aux données personnelles et aux accès administratifs.
- Définir les exigences réglementaires à faire vérifier par des professionnels compétents au Burkina Faso.
- Définir la politique de sauvegarde, les objectifs RPO/RTO et la procédure d’incident.
- Transformer les exigences identifiées dans le cahier des charges en backlog traçable.

**Livrable :** cadrage versionné, décisions consignées, backlog priorisé et critères d’acceptation.

## 3. Phase 1 — Fondation technique et multi-entreprises

- Stabiliser l’application Next.js / TypeScript et les environnements développement, préproduction et production.
- Mettre en place l’authentification, les profils, la création d’entreprise et l’invitation des membres.
- Formaliser les rôles et permissions par entreprise, module et action.
- Garantir l’isolation des données par entreprise côté serveur et au niveau de la base de données (RLS lorsque retenu).
- Mettre en place le journal d’audit des actions sensibles.
- Vérifier les migrations sur une base neuve et dans un environnement non productif.
- Sécuriser les fichiers privés, les secrets et les configurations.
- Vérifier la CI, les dépendances et les procédures de sauvegarde/restauration.

**Critères de sortie :** contrôles d’accès positifs et négatifs réussis, isolation interentreprises démontrée, CI verte, restauration testée et décisions de sécurité documentées. Aucune migration ne doit être appliquée en production sans sauvegarde, plan de retour arrière et validation de l’environnement cible.

### 3.1 Chantier transversal — internationalisation FR/EN

Ce chantier s'ajoute à la fondation, sans remplacer les contrôles de sécurité ou les priorités métier existantes. Il est livré par PRs limitées :
- Formaliser ADR-002 et valider un prototype `next-intl` dans la version Next.js en place.
- Préserver les routes françaises sans préfixe et introduire l'anglais sous `/en`.
- Composer le routage avec `src/proxy.ts` et Supabase SSR dans un seul proxy.
- Centraliser les catalogues FR/EN et localiser les parcours déjà livrés ainsi que leurs états chargement, vide, succès, erreur et absence de permission.
- Auditer RLS et privilèges avant d'ajouter la préférence linguistique persistée de l'utilisateur.
- Localiser les e-mails et notifications concernés.
- Remplacer les formats codés en dur par des formatters recevant locale, devise et contexte temporel.
- Tester routes, sessions, invitations, droits, accessibilité et isolation dans les deux langues.

**Critères de sortie :** routes françaises compatibles, routes anglaises sous `/en`, préférence persistante, proxy Supabase fonctionnel, catalogues complets, formatage exact et CI/tests verts.

### 3.2 Paramètres régionaux

Réutiliser et auditer `companies.country_code`, `companies.default_currency` et `companies.timezone`. Utiliser ISO 3166-1 alpha-2, ISO 4217 et IANA. Les montants restent décimaux en base. Ne jamais additionner des devises différentes sans conversion documentée, datée et traçable.

## 4. Phase 2 — Gestion commerciale et financière quotidienne (MVP P0)

- Répertoires clients et fournisseurs.
- Devis, lignes de devis, acceptation/refus et conversion en facture.
- Factures, numérotation contrôlée, statuts et corrections traçables.
- Enregistrement d’un ou plusieurs règlements par facture et calcul du solde restant.
- Dépenses, justificatifs, catégories et processus de validation.
- Caisses et comptes de trésorerie manuels ; encaissements, décaissements et transferts internes.
- Budgets par période/catégorie et comparaison prévu, engagé et payé.
- Tableau de bord initial distinguant chiffre d’affaires facturé, encaissements, dépenses payées, créances, dettes et trésorerie.
- Exports PDF et CSV/XLSX soumis aux autorisations et à la journalisation.
- Documents privés liés à l’entreprise et à leur objet métier.

**Critères de sortie :** parcours vente-paiement et dépense-budget testés de bout en bout ; montants exacts ; absence de double comptage des transferts ; statuts cohérents ; historique et exports contrôlés.

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
| **P0 — indispensable** | Création d’entreprise, authentification, rôles, clients/fournisseurs, devis et factures simples, règlements, dépenses, caisses/comptes manuels, budgets, tableau de bord de base, exports et journal d’audit |
| **P0 — paie de base** | Dossiers employés, éléments de rémunération, périodes, avances/retenues, simulation et bulletin après validation des règles locales |
| **P1 — évolution proche** | Stocks, achats avancés, projets, alertes d’échéance, rapports avancés, modèles de documents et import contrôlé |
| **P2 — évolution future** | Comptabilité complète, intégrations bancaires/Mobile Money, adaptateurs réglementaires multi-pays et conversions multi-devises avancées, application mobile native, mode hors ligne et API partenaires |

Les priorités métier P0/P1/P2 reprennent le cahier des charges v0.1 et restent inchangées par l’avenant v0.2. Le chantier i18n FR/EN est transversal à la Phase 1 ; il ne reclasse pas les fonctionnalités métier P1/P2 en P0.

## 10. Règles de livraison et de gouvernance

- Une exigence fonctionnelle doit être reliée à une issue, un test et un critère d’acceptation.
- Une fonctionnalité n’est terminée que si le code est relu, les tests requis passent, les permissions sont vérifiées et la documentation est à jour.
- Les branches de fonctionnalité/correction sont fusionnées par Pull Request après CI et revue.
- Les migrations sont versionnées, relisibles et testées sur une base neuve et un environnement non productif.
- Aucune donnée réelle de paie ou de client n’est utilisée dans les tests ou démonstrations.
- Les règles fiscales, sociales et comptables sont versionnées, sourcées et validées avant activation.
- Les décisions ouvertes, anomalies et risques résiduels sont maintenus dans le registre du projet.

**Référence de priorité :** cahier des charges v0.1 (sections 03, 13 et 14) et avenant n°1 v0.2. En cas de divergence, le document consolidé prévaut dans son champ d'application.
