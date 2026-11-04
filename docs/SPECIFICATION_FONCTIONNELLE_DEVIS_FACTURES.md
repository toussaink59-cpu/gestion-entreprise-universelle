# Spécification fonctionnelle — Devis et factures

**Produit :** PolyGest  
**Périmètre :** première version du module commercial — devis, factures intégrales et facturation fractionnée  
**Statut :** proposition fonctionnelle à valider avant toute migration SQL  
**Marché initial :** Burkina Faso, avec paramètres conçus pour ne pas figer les règles d'un seul pays

## 1. Objectif

Permettre à chaque entreprise de créer des devis, de les transmettre à ses clients, d'enregistrer leur décision, puis de facturer le montant accepté soit en une seule fois, soit en plusieurs tranches (acompte, situations successives et solde final).

Le module doit préserver l'historique des documents émis, empêcher la facturation supérieure au devis accepté, isoler les données de chaque entreprise et préparer l'intégration ultérieure des encaissements.

## 2. Périmètre de la V1

### Inclus

- Création, consultation et modification des devis à l'état brouillon.
- Gestion des lignes : description libre, unité, quantité, prix unitaire, remise et traitement fiscal sélectionné dans le référentiel autorisé du profil entreprise.
- Calcul des sous-totaux, remises, taxes et totaux avec une arithmétique décimale fiable.
- Numérotation des devis par série commerciale et des factures par série légale validée ; aucune remise à zéro annuelle ou réattribution d'un numéro n'est supposée autorisée sans validation locale.
- Enregistrement de l'envoi d'un devis et de la réponse du client.
- Acceptation, refus, expiration calculée à partir de la date de validité et annulation d'un devis.
- Génération d'une facture autonome ou depuis un devis accepté.
- Facturation intégrale du devis en une facture.
- Facturation fractionnée en un ou plusieurs acomptes, factures de situation et facture de solde.
- Calcul du montant déjà facturé et du reste à facturer pour chaque devis.
- Aperçu et génération PDF à partir des données figées du document.
- Journalisation des événements importants dans le journal d'audit existant.
- Registre minimal des événements d'avance/acompte et des paiements reçus nécessaires à la détermination de l'exigibilité de la TVA ; ce registre ne remplace pas le module Trésorerie.
- Contrôles de permissions et isolation multi-entreprises côté serveur et en base.

### Hors périmètre de la V1

- Gestion complète des paiements, rapprochement bancaire, caisse, comptes de trésorerie et lettrage : ils feront l'objet du module Encaissements / Trésorerie. En revanche, le registre fiscal minimal des événements de paiement (date, montant, moyen, justificatif, retenue éventuelle) est requis dès la V1 pour calculer correctement l'exigibilité de TVA sur certaines avances et prestations.
- Catalogue de produits/services, stocks et mouvements de stock : les lignes sont saisies librement dans cette V1.
- Automatisation complète des avoirs, notes de crédit et remboursements. Une procédure contrôlée de correction des factures émises/certifiées reste toutefois obligatoire avant utilisation réelle ; une facture émise ne doit jamais être supprimée ou modifiée silencieusement.
- Signature électronique ou portail client.
- Relances automatiques, échéanciers automatisés et envoi d'e-mails transactionnels intégré. L'utilisateur peut marquer un document comme transmis après l'avoir envoyé par son canal habituel.
- Facturation multi-devises et conversion de devises.
- Comptabilité générale et déclarations fiscales.
- Émission de FEC par PolyGest tant que le SFE n'a pas obtenu l'homologation requise et que les spécifications officielles d'intégration n'ont pas été validées.
- Garantie de conformité fiscale ou légale sans validation par un professionnel compétent du pays et du régime concernés.

### Règle de TVA retenue pour le marché initial (Burkina Faso)

La présentation d'une facture « avec TVA » ou « sans TVA » dépend du régime fiscal et de l'autorisation effective de l'entreprise émettrice. Ce n'est pas une option libre que l'utilisateur peut choisir facture par facture.

Selon les informations publiées par la Direction générale des impôts (DGI) :

| Chiffre d'affaires annuel HT | Régime indiqué | Autorisation de facturer la TVA |
|---|---|---|
| Inférieur à 15 000 000 FCFA | Contribution des micro-entreprises (CME) | Non |
| De 15 000 000 FCFA inclus à moins de 50 000 000 FCFA | Réel simplifié d'imposition (RSI) | Non |
| Égal ou supérieur à 50 000 000 FCFA | Réel normal d'imposition (RNI) | Oui |

La DGI précise que seuls les contribuables relevant du RNI sont habilités à facturer la TVA. Le seuil est exprimé en chiffre d'affaires annuel hors taxes. Il est ajusté au prorata du temps d'exploitation pour une activité commencée en cours d'année. Une entreprise au RSI peut demander l'option pour le RNI, sous conditions, notamment l'acceptation de la DGI, la régularité fiscale, un système comptable et un engagement de déclarer/payer la TVA. La DGI indique également qu'une baisse du chiffre d'affaires sous le seuil ne conduit au RSI qu'après trois années consécutives sous ce seuil.

**Conséquences fonctionnelles pour PolyGest :**
- Le profil de facturation de l'entreprise porte son régime fiscal, son statut d'autorisation de collecte de TVA et la période d'effet de cette autorisation.
- L'application détermine les modèles de document disponibles à partir de ce profil : présentation sans TVA pour une entreprise non autorisée ; présentation avec TVA pour une entreprise autorisée.
- Un utilisateur ne peut ni activer la TVA sur une facture isolée, ni la désactiver pour contourner le régime de l'entreprise.
- Le serveur vérifie le statut fiscal effectif à la date d'émission. Les taux et mentions exactes restent paramétrables et doivent être validés avec un professionnel fiscal au Burkina Faso ; aucun taux n'est présumé ici.
- Les documents transmis/émis conservent un snapshot du régime et du statut TVA de l'émetteur. Un changement ultérieur du profil ne modifie jamais un document historique.
- Si le régime ou l'autorisation change entre l'envoi d'un devis et l'émission de la facture, l'émission est bloquée jusqu'à revue du devis et validation des montants/mentions applicables.
- Les situations particulières (notamment les régimes CSE/RND, activités particulières ou décisions fiscales individuelles) ne sont pas déduites automatiquement du chiffre d'affaires : elles nécessitent une configuration vérifiée.

Références officielles : [DGI — Régimes d'imposition](https://dgi.bf/regime_imposition/) et [DGI — FAQ Régimes d'imposition](https://dgi.bf/faq-regimes-dimposition/). Le paramétrage doit être revalidé en cas d'évolution de la législation.

### Facture normalisée et FEC : exigences distinctes

La facture normalisée est un document fiscal obligatoire pour les industriels, commerçants, prestataires de services, importateurs, producteurs et entrepreneurs de travaux immobiliers visés par les textes, quel que soit leur régime, sous réserve des dispenses légales. Une entreprise qui ne collecte pas la TVA n'est donc pas automatiquement dispensée d'émettre une facture normalisée.

La facture électronique certifiée (FEC) relève d'un régime distinct. Les textes consultés prévoient l'obligation pour les entreprises relevant de la DGE et des DME, sous réserve des conditions et étapes d'application fixées par les textes et communiqués DGI. PolyGest doit enregistrer séparément le rattachement DGE/DME et le régime fiscal (RNI/RSI/CME/etc.).

Le calendrier de mise à disposition annoncé le 28 août 2026 distingue la DGE (7 septembre 2026), les contribuables RNI des DME (2 novembre 2026) et les contribuables RND des DME (1er décembre 2026), avec 30 jours de mise en conformité après chaque date. Un communiqué DGI du 29 octobre 2026 annonce une utilisation effectivement exigée par les contribuables DGE à partir du 1er janvier 2027. Les échéances DME non explicitement publiées pour une catégorie donnée ne doivent pas être extrapolées ; joindre les copies officielles et confirmer la situation de chaque entreprise avant activation. L'arrêté FEC prévoit aussi une exigence d'acceptation côté acheteur public/RND pour les FEC émises par des fournisseurs locaux, sous réserve d'exceptions.

Un document PDF produit par PolyGest ne doit jamais être présenté comme une FEC sans émission et authentification par un système SECeF/SFE homologué. Le chantier FEC est bloqué jusqu'à obtention de la documentation technique officielle, de l'homologation pertinente et des tests requis. Référentiel détaillé : [Conformité fiscale — Facturation au Burkina Faso](CONFORMITE_FISCALE_BURKINA_FACTURATION.md).

### Exigibilité de TVA et facturation fractionnée

Les avances/acompte effectivement reçus peuvent rendre la TVA exigible avant l'achèvement d'une prestation de services ou de travaux immobiliers. La date d'émission de facture, la date de livraison/achèvement et la date réelle d'encaissement ne sont donc pas toujours interchangeables. Pour les entreprises autorisées à collecter la TVA, la V1 doit enregistrer les événements d'encaissement fiscalement pertinents, même si le rapprochement bancaire et la trésorerie complète restent hors périmètre.

Le type d'opération (biens, services, travaux immobiliers, importation/service de non-résident ou autre catégorie validée) doit déterminer les règles de fait générateur et d'exigibilité. Ne pas appliquer une seule date de TVA à toutes les factures.

### Règles de taux et de présentation

Le taux normal de référence documenté est 18 %. Le taux réduit de 10 % ne s'applique qu'à des catégories et conditions spécifiques, notamment les prestations d'hébergement/restauration par des établissements agréés et le transport aérien domestique. Les taux, exonérations et dates d'effet doivent être versionnés, sourcés et autorisés par le profil fiscal et la nature de l'opération. Une facture émise par un fournisseur non autorisé à collecter la TVA doit être présentée sans ligne fictive de TVA à 0 %.

## 3. Acteurs et permissions proposées

La base actuelle possède les rôles `owner`, `company_admin`, `finance`, `sales_purchasing`, `auditor`, `hr_payroll`, `operations` et `employee`. Elle possède déjà les actions `read`, `create`, `update`, `validate`, `cancel` et `export`, mais le module `quotes` n'existe pas encore dans le référentiel des permissions.

**Matrice validée par le porteur du projet le 4 novembre 2026 :**

| Rôle | Devis | Factures |
|---|---|---|
| owner | Tous droits | Tous droits |
| company_admin | Tous droits, hors paie selon le modèle global | Tous droits, hors paie selon le modèle global |
| finance | Lecture et export | Lecture, création et modification des brouillons, émission et export ; toute correction d'une facture émise suit une procédure distincte |
| sales_purchasing | Lecture, création, modification des brouillons, transmission et enregistrement de la réponse client | Lecture seule ; aucune création, modification, émission ou annulation |
| auditor | Lecture et export | Lecture et export |
| hr_payroll, operations, employee | Aucun accès par défaut | Aucun accès par défaut |

Précisions :
- `validate` sur les devis couvre la transmission et l'enregistrement de la décision du client ; cela ne signifie pas que l'utilisateur peut modifier un devis déjà transmis.
- `validate` sur les factures couvre l'émission définitive et la réservation du numéro de facture.
- Les actions de l'interface ne constituent jamais la protection : les permissions doivent être vérifiées côté serveur et par RLS / fonctions SQL.
- Le rôle `company_admin` hérite des permissions de modules hors paie selon la stratégie existante. La migration devra ajouter explicitement les nouvelles permissions du module `quotes` aux rôles concernés.
- Toute modification de cette matrice devra être reflétée dans les tests d'autorisation positifs et négatifs.

## 4. Parcours fonctionnels

### 4.1 Choisir le contexte d'entreprise

- L'utilisateur doit être authentifié et disposer d'une appartenance active à l'entreprise sélectionnée.
- Un utilisateur membre de plusieurs entreprises choisit le contexte avant de consulter ou créer un document.
- Le serveur vérifie l'appartenance et les permissions pour chaque lecture et chaque action.
- Un identifiant d'entreprise ou de document envoyé par le navigateur ne constitue jamais une preuve d'autorisation.

### 4.2 Créer un devis

1. L'utilisateur choisit un client actif de la même entreprise.
2. Il saisit la date, la durée de validité, l'objet, les conditions et les lignes du devis.
3. Chaque ligne comprend au minimum une description, une quantité positive, une unité et un prix unitaire.
4. Il peut ajouter une remise de ligne et appliquer uniquement les taxes autorisées par le profil fiscal effectif de l'entreprise ; la TVA ne peut pas être activée librement sur un document.
5. Le serveur valide et calcule les montants ; le navigateur peut afficher une prévisualisation mais ne fait pas autorité.
6. Le devis est sauvegardé en brouillon. Un brouillon peut être modifié ou annulé. La suppression définitive des documents commerciaux n'est pas proposée en V1 afin de préserver la traçabilité.
7. Le numéro définitif est attribué de façon atomique au moment de la transmission ; les brouillons non transmis ne consomment donc pas de numéro officiel.

### 4.3 Transmettre et traiter un devis

- Au moment de la transmission, le système vérifie à nouveau le client, les lignes, les montants, la devise, les paramètres fiscaux et les informations de l'entreprise.
- Il fige les coordonnées du client et de l'émetteur utilisées sur le document, attribue le numéro et enregistre `sent_at`.
- La transmission peut être faite manuellement hors de PolyGest dans la V1. L'utilisateur ne peut marquer le devis comme transmis qu'après l'avoir effectivement envoyé.
- La décision du client est enregistrée par un utilisateur autorisé : acceptation ou refus, date, acteur et mode de preuve (par exemple e-mail, document signé hors ligne ou confirmation verbale). Une référence ou une note peut être ajoutée.
- L'acceptation est refusée si la date de validité est dépassée, si le devis est annulé ou si le devis n'est plus à l'état transmissible.
- L'expiration est calculée lorsque le devis est transmis et que sa date de validité est antérieure à la date locale de référence de l'entreprise ; elle ne nécessite pas un traitement automatique en arrière-plan.
- Après transmission, les lignes, prix, taxes et conditions du devis ne sont plus modifiables. Pour changer l'offre, créer un nouveau devis brouillon et conserver le précédent dans l'historique.

### 4.4 Facturation intégrale

Préconditions :
- Le devis est accepté.
- Aucun montant n'a déjà été facturé sur ce devis.
- Aucune facture non annulée issue de ce devis n'a déjà été émise.

Fonctionnement :
1. L'utilisateur autorisé choisit « Facturer intégralement ».
2. PolyGest prépare une facture brouillon à partir des lignes et des informations figées du devis.
3. L'utilisateur vérifie la date, l'échéance et les informations de facturation.
4. À l'émission, le serveur verrouille le devis, vérifie qu'il n'a pas été facturé entre-temps, attribue le numéro et fige la facture.
5. Le montant imputé au devis doit correspondre exactement au montant accepté restant à facturer.

Résultat : une facture émise ; le reste à facturer du devis devient zéro.

### 4.5 Facturation fractionnée

La V1 doit permettre trois catégories de tranches :

- **Acompte :** facture d'une somme initiale convenue, saisie en montant fixe. La ligne d'acompte est rattachée au devis mais n'est pas affectée à une quantité d'une ligne du devis.
- **Situation / avancement :** facture d'une nouvelle tranche correspondant à des quantités supplémentaires ou à des prestations supplémentaires réalisées. Une ligne liée au devis conserve la référence à la ligne source et la quantité facturée au cours de cette tranche.
- **Solde final :** facture du montant exact restant à facturer. Son émission clôt la possibilité d'émettre d'autres factures sur ce devis.

Règles impératives :
- Chaque facture partielle correspond uniquement à une nouvelle tranche du montant du devis. Elle ne répète pas les montants déjà facturés.
- Le montant imputé au devis est le total TTC (ou total du document selon le régime fiscal paramétré) de la facture émise.
- Le cumul des montants imputés par les factures émises ne peut jamais dépasser le total accepté du devis. Une correction fiscale ne libère pas automatiquement l'allocation ; seul le mécanisme de correction validé peut ajuster le solde.
- Le solde restant à facturer est calculé par le serveur : total accepté moins cumul déjà facturé.
- Une facture de situation liée à une ligne du devis ne peut pas porter le cumul des quantités facturées au-delà de la quantité acceptée sur cette ligne.
- Un acompte augmente le montant facturé du devis mais ne consomme pas la quantité des lignes.
- Une facture de solde doit utiliser exactement le solde restant ; après elle, aucune autre facture ne peut être émise sur le devis.
- Une facture émise reste comptabilisée dans le cumul tant qu'un document de correction légalement admis n'a pas été émis et relié à l'original ; la simple ouverture d'un dossier de correction ne libère pas le montant.
- Les contrôles doivent être transactionnels avec verrouillage du devis afin d'éviter deux émissions simultanées qui dépasseraient le total.

**Convention de facturation retenue pour la V1 :** une facture de situation représente une tranche nouvelle, et non un cumul d'avancement déjà facturé. Les montants des factures successives s'additionnent pour atteindre le total accepté ; les acomptes ne sont pas déduits une seconde fois dans les factures suivantes. Cette convention doit être explicitement affichée dans l'interface et validée par un professionnel comptable/fiscal avant toute utilisation réelle, car les usages et mentions de facture peuvent dépendre du pays et du régime.

Exemple purement illustratif, hors taxe et sans portée réglementaire :

| Document | Montant imputé au devis | Cumul facturé | Reste à facturer |
|---|---:|---:|---:|
| Devis accepté | 1 000 000 | 0 | 1 000 000 |
| Acompte | 300 000 | 300 000 | 700 000 |
| Situation 1 | 250 000 | 550 000 | 450 000 |
| Situation 2 | 250 000 | 800 000 | 200 000 |
| Solde final | 200 000 | 1 000 000 | 0 |

### 4.6 Facture autonome

- Une facture peut être créée sans devis.
- Elle utilise le même moteur de lignes, calculs, numérotation, snapshots, émission et audit.
- Elle n'entre dans aucun calcul de reste à facturer d'un devis.
- Le client doit appartenir à la même entreprise.

### 4.7 Émission, consultation et correction d'une facture

- Une facture brouillon est modifiable ou peut être abandonnée ; la suppression définitive n'est pas proposée en V1.
- À l'émission, son numéro, ses dates, les coordonnées du client et de l'émetteur, les lignes, la devise, les taxes et les totaux sont figés.
- Une facture émise n'est jamais modifiée ni supprimée silencieusement.
- Une facture émise ne passe pas simplement à l'état `cancelled` pour effacer sa portée fiscale. Une erreur après émission ouvre un dossier de correction lié à l'original ; le mécanisme légal (avoir, facture rectificative ou procédure SECeF/SFE) doit être établi avant toute mise en production.
- La correction complète et l'émission d'avoirs sont hors du périmètre fonctionnel actuel ; tant que ce mécanisme n'est pas livré et validé, l'émission réelle doit être désactivée dans les cas où une correction pourrait être nécessaire.
- Le statut de paiement ne sera pas modifié manuellement dans ce module. Il sera calculé à partir des encaissements et affectations de paiements, développés dans le module suivant.

## 5. Statuts et transitions

### Devis

| Statut stocké | Signification | Transitions permises |
|---|---|---|
| `draft` | En préparation | `sent`, `cancelled` |
| `sent` | Transmis au client | `accepted`, `rejected`, `cancelled` |
| `accepted` | Accepté par le client | Facturation permise ; annulation motivée du solde non facturé par procédure autorisée |
| `rejected` | Refusé | Terminal |
| `cancelled` | Annulé ou clôturé pour le solde non facturé | Terminal ; les factures déjà émises restent inchangées |

L'état `expired` est calculé à partir de `status = sent` et `valid_until < date de référence` ; il n'est pas nécessaire de modifier une ligne en tâche de fond. L'acceptation d'un devis expiré est refusée. Un devis accepté peut être annulé pour fermer le solde non facturé, avec permission et motif ; les factures déjà émises restent inchangées et traçables.

Le niveau de facturation (non facturé, partiellement facturé, totalement facturé) est un indicateur calculé à partir des factures émises et non annulées ; il ne remplace pas le statut commercial du devis.

### Facture

| Statut stocké | Signification | Transitions permises |
|---|---|---|
| `draft` | Préparation, non opposable comme facture émise | `issued`, `abandoned_draft` |
| `issued` | Numérotée et figée | Reste émise ; une correction est portée par un dossier/document lié, pas par effacement de l'original |
| `abandoned_draft` | Brouillon abandonné avant émission, sans facture fiscale délivrée | Terminal |

Les états « impayée », « partiellement payée », « payée » et « en retard » sont des états de règlement calculés après intégration des paiements. « En retard » dépend de l'échéance et du solde restant dû ; ce n'est pas un statut métier à saisir manuellement.

## 6. Calculs financiers

- Utiliser des types décimaux en base, jamais `float` ou `double precision` pour les montants.
- Quantités : précision suffisante pour les unités fractionnaires (ex. `numeric(18,4)`).
- Prix, remises, taxes et montants : types décimaux (proposition `numeric(20,4)` ou précision affinée pendant la migration).
- Taxe exprimée explicitement en pourcentage avec une précision définie ; le libellé et le taux appliqué sont figés sur chaque ligne émise.
- Calcul par ligne : quantité × prix unitaire, remise, base taxable, taxe, total de ligne. La règle d'arrondi doit être unique et testée.
- La somme des lignes constitue le total du document ; le serveur recalcule les valeurs reçues et refuse toute incohérence.
- V1 : remise par ligne uniquement ; la remise globale au niveau du document est reportée si elle n'est pas nécessaire au pilote.
- V1 : une seule devise par document, issue de la devise par défaut de l'entreprise ; aucune conversion.
- Les taux, exemptions, catégories de taxe, mentions obligatoires et règles d'arrondi doivent être paramétrables et validés pour le Burkina Faso et chaque régime visé. Aucun taux légal n'est codé en dur dans cette spécification.
- La possibilité de facturer la TVA est contrôlée au niveau de l'entreprise et à la date d'émission, conformément à la section « Règle de TVA retenue pour le marché initial » ; une ligne à taux nul ne doit pas être utilisée pour simuler une facture sans TVA.

## 7. Expérience utilisateur attendue

Écrans principaux :
1. Liste des devis : recherche, filtres par statut/période/client, tri, pagination et action de création.
2. Création/édition de devis : sélection client, dates, lignes dynamiques, totaux recalculés, sauvegarde brouillon.
3. Détail du devis : document, statut, historique, aperçu PDF, transmission, décision et action de facturation.
4. Liste des factures : recherche, filtres par statut/période/client, indicateur de provenance (devis ou autonome).
5. Création/édition de facture : mode autonome ou depuis devis, lignes, échéance et total.
6. Détail de facture : aperçu figé, PDF, émission et ouverture d'un dossier de correction.

Règles UI :
- Respecter `docs/POLYGEST_DESIGN_SYSTEM.md` et les skills `polygest-frontend-design` et `polygest-ui-quality`.
- Aucun emoji, dégradé décoratif ou couleur de statut sans libellé explicite.
- Un tableau reste privilégié pour les listes de documents.
- Afficher clairement le total accepté, le total déjà facturé et le reste à facturer.
- Pour une facture partielle, montrer la tranche en cours et le solde après émission.
- Tous les formulaires gèrent les états de chargement, validation, erreur, succès et absence d'autorisation.
- Les montants et devises sont formatés selon les paramètres de l'entreprise ; le calcul ne dépend jamais du format d'affichage.

## 8. Documents PDF

- Un PDF est rendu à partir du snapshot émis, et non à partir des coordonnées actuelles du client ou de l'entreprise.
- Le PDF doit afficher au minimum l'identité de l'émetteur, l'identité du client, le numéro, les dates, les lignes, les totaux, la devise, les taxes et les conditions pertinentes.
- Les mentions obligatoires exactes restent à valider selon la juridiction et le régime.
- Les PDF stockés sont privés ; aucun lien public permanent ne doit être créé.
- Une URL temporaire, si nécessaire, doit être générée après vérification des permissions.
- Un téléchargement/export exige la permission `export` et la vérification d'appartenance à l'entreprise.

## 9. Exigences de sécurité

- Toutes les tables métier contiennent `company_id`.
- RLS activée et accès refusé par défaut.
- Les règles d'accès utilisent `app.has_permission(company_id, module, action)`.
- Les clés étrangères composites empêchent les références client/document entre entreprises.
- Les transitions de statut, numérotations et émissions définitives sont réalisées par des fonctions serveur/SQL contrôlées, avec privilèges minimaux.
- Les fonctions privilégiées fixent un `search_path` sûr, vérifient l'acteur authentifié et ne font confiance à aucun total fourni par le navigateur.
- Les événements importants utilisent le journal `audit_events` existant en ajout seul ; ne pas y copier les données personnelles complètes ni les secrets.
- Les tests couvrent deux entreprises, plusieurs rôles, un utilisateur révoqué et les tentatives d'accès par identifiant direct.
- Les contraintes métier critiques doivent être vérifiées en transaction, pas uniquement par le formulaire.

## 10. Critères d'acceptation fonctionnels

- [ ] Un membre autorisé peut créer un devis brouillon pour un client de sa propre entreprise.
- [ ] Un utilisateur ne peut pas utiliser le client d'une autre entreprise.
- [ ] Un brouillon peut être modifié ; un devis transmis ne peut plus être modifié.
- [ ] Un devis transmis peut être accepté ou refusé par un utilisateur autorisé.
- [ ] Un devis expiré ne peut pas être accepté.
- [ ] Le passage à l'émission attribue un numéro unique et fige les données.
- [ ] Un devis accepté sans facture peut générer une facture intégrale.
- [ ] Un devis déjà partiellement facturé ne peut plus générer une facture intégrale.
- [ ] Un utilisateur autorisé peut émettre un acompte inférieur ou égal au reste à facturer.
- [ ] Plusieurs factures de situation peuvent suivre tant que le reste est positif.
- [ ] Les quantités cumulées facturées par ligne ne dépassent pas les quantités du devis.
- [ ] La facture de solde consomme exactement le reste à facturer et clôt les émissions sur le devis.
- [ ] Deux émissions simultanées ne peuvent pas dépasser le montant accepté.
- [ ] Un brouillon de facture ne réduit pas le reste à facturer ; seules les factures émises non annulées le font.
- [ ] Une facture autonome ne modifie aucun devis.
- [ ] Une facture émise est immuable ; son annulation exige un motif et une permission.
- [ ] Le PDF utilise les snapshots figés.
- [ ] Un utilisateur non autorisé ne peut ni lire ni exporter un document par URL directe.
- [ ] Les calculs sont exacts selon les règles d'arrondi validées et les tests de limite.

## 11. Scénarios de tests minimum

- Création, modification, transmission, acceptation, refus et expiration d'un devis.
- Conversion intégrale normale et double tentative d'émission.
- Acompte fixe, plusieurs situations, solde final et tentative de dépassement.
- Quantités facturées par ligne, y compris deux factures concurrentes sur la même ligne.
- Annulation et recalcul du reste à facturer.
- Client archivé, client d'une autre entreprise, entreprise suspendue et appartenance révoquée.
- Droits distincts de `owner`, `company_admin`, `finance`, `sales_purchasing` et `auditor`.
- Remises, taxes à zéro, taux différents, arrondis, quantité fractionnaire et montant nul/interdit.
- Génération PDF à partir d'un snapshot alors que le client a été modifié ensuite.
- Numérotation simultanée, numérotation par entreprise et changement de période.

## 12. Décisions à confirmer avant implémentation

Les éléments suivants ne sont pas déterminés par les migrations actuelles et doivent être validés :

1. **Réglementation et fiscalité :** mentions obligatoires des devis/factures, identifiants fiscaux, taxes applicables, exonérations, arrondis, délais et règles d'annulation. Faire vérifier par un professionnel compétent au Burkina Faso.
2. **Profil émetteur :** adresse, téléphone, e-mail, identifiant fiscal, logo et conditions de règlement requis sur les documents.
3. **Numérotation :** format souhaité (préfixe, année, compteur) et éventuelles obligations de séquence.
4. **Permissions :** matrice validée le 4 novembre 2026. Les tests et migrations doivent la faire respecter, notamment l'interdiction de création/modification de factures pour `sales_purchasing`.
5. **Correction :** confirmer la procédure légale d'avoir, facture rectificative ou correction SECeF/SFE pour une facture émise.
6. **Mode de transmission :** manuel en V1 ou intégration d'un fournisseur d'e-mail.
7. **Devise et précision :** confirmer les paramètres de devise et d'arrondi par entreprise.

La matrice des rôles est validée. Les autres décisions réglementaires, profil émetteur, numérotation et correction restent ouvertes. Aucune émission fiscale ne doit être activée tant que ces points ne sont pas validés. La présente spécification constitue le contrat fonctionnel de référence pour la conception technique, sous réserve des validations réglementaires indiquées.


### Référentiel réglementaire burkinabè

La spécification doit être lue avec [CONFORMITE_FISCALE_BURKINA_FACTURATION.md](CONFORMITE_FISCALE_BURKINA_FACTURATION.md), qui documente les régimes, la facture normalisée, la FEC, les taux, l'exigibilité, les retenues, les moyens de paiement et la conservation. Ce référentiel est daté du 3 novembre 2026 et demeure soumis à validation fiscale avant mise en production.
