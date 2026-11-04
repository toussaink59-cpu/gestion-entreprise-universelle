# Feuille de route PolyGest

**Référence fonctionnelle :** Cahier des charges — Plateforme web universelle de gestion d’entreprise, version 0.1 du 19 octobre 2026.  
**Mise à jour :** 4 novembre 2026.

Cette feuille de route traduit le cahier des charges en phases de réalisation. En cas de divergence, le cahier des charges prévaut. Toute évolution du périmètre doit être documentée et approuvée dans une nouvelle version du cahier des charges.

Une priorité **P0** signifie qu’une capacité appartient au MVP ; elle ne signifie pas qu’elle doit être développée avant les fondations techniques. Les phases organisent l’ordre de réalisation, tandis que les priorités définissent le périmètre de livraison.

## 1. État documentaire du projet

D’après les éléments de suivi actuellement consignés dans le dépôt :

- **Phase 0 — Cadrage :** cahier des charges v0.1 disponible ; les décisions ouvertes doivent encore être arbitrées et consignées.
- **Phase 1 — Fondation :** en cours d’audit et de consolidation ; elle ne doit pas être déclarée terminée sans preuves récentes des contrôles, tests et restaurations.
- **Phase 2 — Gestion quotidienne :** amorcée par les répertoires clients et fournisseurs ; devis, factures, paiements, dépenses, trésorerie, budgets et exports restent à réaliser ou à valider selon l’état réel du code.
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
- Multi-devise avancée et extension multi-pays.
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
| **P2 — évolution future** | Comptabilité complète, intégrations bancaires/Mobile Money, multi-devise avancée, multi-pays, application mobile native, mode hors ligne et API partenaires |

Les priorités ci-dessus reprennent le cahier des charges v0.1. Elles ne peuvent être modifiées que par une décision de cadrage documentée.

## 10. Règles de livraison et de gouvernance

- Une exigence fonctionnelle doit être reliée à une issue, un test et un critère d’acceptation.
- Une fonctionnalité n’est terminée que si le code est relu, les tests requis passent, les permissions sont vérifiées et la documentation est à jour.
- Les branches de fonctionnalité/correction sont fusionnées par Pull Request après CI et revue.
- Les migrations sont versionnées, relisibles et testées sur une base neuve et un environnement non productif.
- Aucune donnée réelle de paie ou de client n’est utilisée dans les tests ou démonstrations.
- Les règles fiscales, sociales et comptables sont versionnées, sourcées et validées avant activation.
- Les décisions ouvertes, anomalies et risques résiduels sont maintenus dans le registre du projet.

**Référence de priorité :** Cahier des charges — Plateforme web universelle de gestion d’entreprise, version 0.1, sections 03, 13 et 14. En cas de divergence, ce cahier des charges prévaut jusqu’à publication d’une nouvelle version approuvée.
