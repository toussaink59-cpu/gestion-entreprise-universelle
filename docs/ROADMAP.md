# Feuille de route proposée

Cette feuille de route est une proposition de séquencement. Les phases ne sont considérées comme terminées qu’après validation des critères d’acceptation et des tests.

## État d’avancement (23 octobre 2026)

- **Phase 0 :** cahier des charges v0.1 rédigé ; plusieurs décisions restent ouvertes (nom, licence, région d’hébergement, sauvegardes, accès de l’équipe plateforme).
- **Phase 1 :** **en cours d’audit, non terminée.** Fondation technique, authentification, isolation multi-entreprises et sauvegarde/restauration existent mais ne sont pas encore validées : voir [l’audit de la Phase 1](PHASE1_CHECKLIST.md).
- **Phase 2 :** démarrée par anticipation (répertoires clients et fournisseurs). Le reste (devis, factures, paiements, dépenses, trésorerie, budgets) n’est pas commencé. Le développement de nouveaux modules métier attend la fin de l’audit de la Phase 1.
- **Phases 3 à 6 :** non commencées.

## Phase 0 — Cadrage

- Valider le cahier des charges, les utilisateurs cibles et le périmètre MVP.
- Choisir le nom, la licence et le modèle d’abonnement envisagé.
- Définir les exigences réglementaires à faire vérifier par des professionnels au Burkina Faso.
- Définir les critères de sécurité et la stratégie de sauvegarde/restauration.

**Livrable :** spécification versionnée et liste d’exigences priorisées.

## Phase 1 — Fondation technique et multi-entreprises

- Créer le projet applicatif, les environnements et l’intégration continue.
- Mettre en place l’authentification, le profil utilisateur et la création d’entreprise.
- Concevoir les rôles et permissions.
- Ajouter l’identifiant de tenant aux données appartenant à une entreprise.
- Implémenter les politiques PostgreSQL/RLS si cette architecture est retenue.
- Tester qu’un utilisateur d’une entreprise ne peut accéder aux données d’une autre.

**Critère de sortie :** tests d’autorisation positifs et négatifs passants, journaux exploitables et sauvegarde/restauration testées.

## Phase 2 — Gestion commerciale et financière de base

- Répertoire clients/fournisseurs.
- Devis, lignes de devis, factures et lignes de facture.
- Enregistrement des paiements et suivi des soldes.
- Dépenses avec catégorie et justificatif.
- Comptes de trésorerie, mouvements et tableau de bord initial.
- Budgets simples et comparaison prévu/réalisé.

**Critère de sortie :** calculs vérifiés, statuts cohérents et opérations auditées.

## Phase 3 — Personnel et paie

- Dossiers du personnel, contrats et éléments variables.
- Paramètres de paie versionnés par date d’effet.
- Calculs tests avec cas de référence validés par un professionnel local.
- Génération des bulletins et états de paie.
- Permissions renforcées sur les informations salariales.

**Condition de sortie :** règles sociales et fiscales vérifiées pour le régime ciblé ; aucun calcul réel annoncé comme conforme avant cette validation.

## Phase 4 — Stocks, projets et équipements

- Catalogue de produits et services.
- Entrées, sorties, transferts et inventaires.
- Projets, tâches, budget et suivi des coûts.
- Équipements, affectation, entretien et immobilisations selon le périmètre validé.

## Phase 5 — Comptabilité et conformité renforcées

- Modèle de comptes et journaux selon le régime applicable.
- Écritures équilibrées, période comptable et verrouillage des périodes.
- États et exports requis.
- Vérification professionnelle du fonctionnement comptable et fiscal.

## Phase 6 — Préparation à la commercialisation

- Formules d’abonnement et limites par offre.
- Facturation de l’abonnement et gestion des statuts de paiement.
- Observabilité, support, gestion d’incidents et procédures d’exploitation.
- Tests de charge, revue de sécurité et pilote avec des entreprises volontaires.

## Priorités MVP

**Priorité P0 :** authentification, isolation des entreprises, rôles, clients/fournisseurs, ventes/factures, paiements, dépenses, trésorerie et tableau de bord initial.

**Priorité P1 :** budget comparatif, exports PDF/Excel, pièces jointes privées, notifications d’échéance.

**Priorité P2 :** paie complète, stocks avancés, comptabilité approfondie, intégrations et fonctions multi-pays.

Les priorités doivent être revalidées selon le budget, les retours utilisateurs et le risque réglementaire.
