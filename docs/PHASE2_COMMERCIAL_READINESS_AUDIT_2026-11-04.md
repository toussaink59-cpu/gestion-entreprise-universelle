# Audit de préparation — Phase 2A commerciale

**Date :** 4 novembre 2026  
**Branche de référence :** `main`  
**Commit inspecté :** `731a20e4b68746908c3723807e1578d482eec223`  
**Référence fonctionnelle :** cahier des charges v0.1 et `docs/ROADMAP.md`  
**Périmètre :** préparation de la première tranche métier devis, factures et événements fiscaux de paiement.

## 1. Résultat exécutif

La branche `main` est à jour au commit inspecté. Les workflows GitHub Actions associés à ce commit sont terminés avec succès :

- CI : run `41821075791` — succès ;
- Supabase réel : run `41821076000` — succès.

Le statut de déploiement Vercel reste distinct : le contrôle Vercel du commit est en échec pour limitation de quota de déploiement (`build-rate-limit`). Ce motif ne constitue pas un échec des tests GitHub Actions et ne justifie aucune modification du code applicatif.

L'inspection du tree complet de `main` confirme que les fondations d'entreprise, membres, clients/fournisseurs et documents privés existent. En revanche, aucune table, migration, route ou page applicative de devis/factures n'est encore présente. Les documents commerciaux sont donc spécifiés, mais non implémentés.

**Conclusion :** le dépôt est techniquement prêt à commencer la Phase 2A par une tranche verticale limitée, après validation des décisions métier qui conditionnent les règles de facturation. La Phase 1 reste ouverte ; ce travail ne vaut ni clôture de Phase 1 ni autorisation de production.

## 2. Éléments réutilisables constatés

### 2.1 Fondations de données et de sécurité

- `companies` fournit déjà le pays, la devise par défaut (XOF par défaut) et le fuseau horaire (Africa/Ouagadougou par défaut).
- `company_memberships`, les rôles et `app.has_permission(company_id, module, action)` fournissent le contexte d'accès par entreprise.
- Les actions existantes sont `read`, `create`, `update`, `validate`, `cancel` et `export`.
- `customers` et `suppliers` sont déjà isolés par entreprise et protégés par RLS.
- `app.log_event(company_id, action, entity_type, entity_id, metadata)` et `audit_events` fournissent un journal append-only réutilisable.
- Le stockage privé sait déjà rattacher les documents aux modules `invoices`, `payments`, `customers` et `suppliers`. Les nouveaux documents commerciaux devront conserver le statut de sécurité du scanner : aucun téléchargement ne doit être autorisé avant analyse antivirus réelle.
- Les tests Supabase locaux réels, les tests d'isolation et le workflow de restauration sont déjà intégrés à la CI.

### 2.2 Permissions existantes à prendre en compte

Le référentiel de permissions contient déjà les modules `invoices`, `payments`, `expenses`, `treasury`, `budgets` et `reports`. Le module `quotes` n'est pas encore présent.

Les droits initiaux de `finance`, `sales_purchasing` et `auditor` sont définis dans la migration de fondation. Toute extension devra être additive et explicite, sans élargir par accident les droits d'autres rôles. La matrice proposée dans la spécification commerciale n'est pas encore une décision métier approuvée.

## 3. Écarts entre les spécifications et l'implémentation

| Sujet | État constaté | Conséquence |
|---|---|---|
| Devis et lignes | Spécifiés, aucune table ou page métier | À implémenter |
| Factures et lignes | Spécifiées, aucune table ou page métier | À implémenter après validation des règles d'émission |
| Profil de facturation de l'entreprise | Modèle proposé, absent du schéma actuel | Nécessaire pour snapshots et contrôles fiscaux |
| Séries et numérotation | Modèle proposé, absent du schéma actuel | Ne pas inventer de format légal |
| Module de permissions `quotes` | Absent | Migration de permissions nécessaire |
| Paiements et trésorerie | Permissions référencées, module métier absent | Garder la frontière entre événement fiscal et futur encaissement complet |
| Correction de facture émise | Dossier de correction évoqué, procédure juridique non arrêtée | Ne jamais modifier ou supprimer une facture émise |
| PDF | Génération prévue, pas de moteur commercial existant identifié | À traiter à partir de snapshots immuables |
| Certification FEC / SECeF | Hors périmètre tant que documentation et homologation ne sont pas établies | Ne jamais appeler un PDF PolyGest « FEC » ou « facture certifiée » |

## 4. Revue des risques de conception à résoudre avant les migrations

### Bloquants métier / conformité

1. **Identité de l'émetteur :** les champs légaux obligatoires et les justificatifs de l'entreprise doivent être confirmés. Les coordonnées actuellement présentes dans `companies` ne suffisent pas nécessairement à établir le profil fiscal d'une facture.
2. **Régime fiscal et TVA :** le régime et le droit de collecte doivent être historisés par dates d'effet et preuves. Aucun utilisateur ne doit pouvoir activer ou désactiver la TVA au niveau d'une facture.
3. **Facture normalisée / FEC :** le document PDF généré par PolyGest ne peut pas être présenté comme une facture normalisée certifiée ou une FEC sans système et processus homologués.
4. **Numérotation :** le format, les séries autorisées, la continuité et le moment exact d'attribution doivent être définis avec un professionnel compétent. Aucun redémarrage annuel n'est présumé légal.
5. **Corrections :** la procédure applicable après émission/certification doit être définie. L'original doit rester immuable ; l'ouverture d'un dossier de correction ne doit pas libérer le montant facturé.
6. **Paiements / exigibilité :** les événements d'encaissement fiscalement pertinents (notamment avances réellement reçues) doivent être distingués des factures émises et du futur rapprochement de trésorerie.

### Points techniques à verrouiller

- Les montants doivent être calculés côté serveur avec une arithmétique décimale déterministe ; les valeurs envoyées par le navigateur ne sont jamais la source de vérité.
- Les contraintes et clés étrangères composites doivent empêcher de rattacher un client, une ligne ou une facture appartenant à une autre entreprise.
- L'émission d'une facture issue d'un devis doit verrouiller le devis, recalculer le solde et réserver le numéro dans une même transaction.
- Les brouillons sont modifiables ; les documents transmis/émis sont figés par snapshots.
- Les fonctions privilégiées doivent vérifier acteur, entreprise, permission et transition, utiliser un `search_path` sûr et ne pas être exécutables par `anon` ou `public`.
- Chaque table métier doit avoir RLS, privilèges minimaux, tests positifs et négatifs et événements d'audit.
- L'extension de la table `documents` doit être examinée avant d'ajouter de nouveaux types de pièces jointes.
- Les migrations doivent réussir sur base neuve et sur la pile Supabase locale réelle ; la restauration doit rester verte.

## 5. Stratégie de livraison proposée

La première livraison métier doit rester petite et vérifiable. Elle ne doit pas essayer de livrer toute la facturation, la TVA et la trésorerie dans une seule PR.

### Tranche A — fondation des devis

- Ajouter le module `quotes` au référentiel des permissions et sa matrice par rôle après validation.
- Créer le profil de facturation minimal et versionné nécessaire aux snapshots, sans activer de règle fiscale non validée.
- Créer devis et lignes, contraintes multi-entreprises, RLS et index.
- Ajouter les fonctions transactionnelles de création/modification de brouillon et de transmission, avec numérotation uniquement après validation du format.
- Construire la liste et le formulaire de devis, états vide/erreur/absence d'accès, et aperçu non certifié.
- Tester les calculs, les transitions, les accès croisés et la concurrence.

### Tranche B — décision client et factures brouillon

- Enregistrer acceptation/refus avec acteur, date, méthode et référence de preuve.
- Créer facture autonome ou liée à un devis accepté, uniquement en brouillon.
- Calculer le montant déjà alloué et le reste à facturer côté serveur.
- Ne pas émettre de facture tant que les exigences fiscales et la procédure de correction ne sont pas validées.

### Tranche C — émission contrôlée

- Ajouter numérotation atomique et immutabilité.
- Ajouter les snapshots fiscaux et l'événement de paiement minimal requis.
- Verrouiller les émissions concurrentes et prévenir le dépassement du devis.
- Ajouter le PDF standard clairement distingué de toute FEC.
- Activer l'émission réelle seulement après revue professionnelle des règles applicables.

### Tranche D — encaissements et trésorerie

- Implémenter les règlements complets/partiels, justificatifs, comptes/caisse, dépenses et transferts dans leur périmètre propre.
- Relier les règlements aux événements fiscaux sans double comptage.
- Ajouter les budgets et le tableau de bord selon les définitions du cahier des charges.

## 6. Critères d'acceptation transversaux

- Une entreprise ne peut jamais lire, modifier ou facturer les données d'une autre entreprise, même avec un UUID connu.
- Les permissions sont vérifiées dans les fonctions serveur et dans les politiques RLS.
- Un utilisateur sans droit ne peut ni créer, ni transmettre, ni émettre par appel direct.
- Les totaux recalculés côté serveur correspondent aux lignes et à la règle d'arrondi documentée.
- Une émission concurrente ne peut pas dépasser le montant ou les quantités acceptés.
- Aucun numéro utilisé n'est réattribué.
- Un document transmis ou émis conserve les snapshots d'origine.
- Une facture émise n'est ni modifiable ni supprimable ; les corrections sont liées et traçables.
- Aucun document n'est présenté comme certifié sans réponse vérifiable d'un système homologué.
- CI web, tests Supabase réels, contrôles de sécurité, lint SQL et restauration réussissent.

## 7. Décisions métier et statut

**Décision confirmée le 4 novembre 2026 : matrice des rôles.** Le porteur du projet a validé la répartition suivante :

- `owner` et `company_admin` : tous les droits commerciaux, dans les limites des permissions globales existantes (notamment l'exclusion de la paie pour `company_admin`).
- `finance` : lecture et export des devis ; lecture, création et modification des brouillons de factures, émission et export. L'annulation directe d'une facture est retirée ; toute correction suit une procédure distincte.
- `sales_purchasing` : lecture, création, modification et transmission des devis, ainsi que saisie de la réponse client ; lecture seule des factures. Aucun droit de créer, modifier, émettre ou annuler une facture.
- `auditor` : lecture et export uniquement.
- `hr_payroll`, `operations`, `employee` : aucun accès commercial par défaut.

**Décisions encore ouvertes :**

1. **Identité de facturation :** qui peut renseigner et valider les identifiants fiscaux et les justificatifs du profil émetteur ?
2. **Numérotation :** quel format interne provisoire utiliser pour les devis ? La série légale des factures doit être validée par un professionnel compétent.
3. **Corrections :** confirmer la procédure légale de correction/avoir/FEC avant toute émission de facture.
4. **Périmètre de la première tranche :** devis brouillons uniquement, sans transmission, numérotation, émission de facture ni calcul fiscal présenté comme définitif.

Le développement avance sur les devis brouillons et leur sécurité. Il ne doit pas activer l'émission légale ou un calcul fiscal non vérifié.

## 8. Références internes

- `docs/CAHIER_DES_CHARGES.pdf`
- `docs/ROADMAP.md`
- `docs/SPECIFICATION_FONCTIONNELLE_DEVIS_FACTURES.md`
- `docs/MODELE_DONNEES_DEVIS_FACTURES.md`
- `docs/CONFORMITE_FISCALE_BURKINA_FACTURATION.md`
- `docs/MATRICE_FISCALE_BURKINA_2026.md`
- `docs/PHASE1_AUDIT_2026-11-04.md`
- `docs/STOCKAGE_DOCUMENTS_PRIVES.md`
