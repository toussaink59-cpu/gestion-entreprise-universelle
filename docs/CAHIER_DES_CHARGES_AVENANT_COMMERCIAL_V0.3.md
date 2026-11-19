# POLYGEST — Avenant n°2 au cahier des charges
## Expérience de construction des documents et bordereau de prix unitaires

**Version :** 0.3  
**Date :** 19 novembre 2026  
**Statut :** exigence produit approuvée par le propriétaire — réalisation obligatoire avant la mise en service officielle ; conception détaillée à décliner en backlog  
**Base documentaire :** cahier des charges initial v0.1, avenant n°1 v0.2 et état du dépôt au commit `72d9ce503b4d15aa4542143f75a366faaadf585f`

## 1. Portée et autorité

Le présent avenant complète le cahier des charges initial v0.1 du 19 octobre 2026 et l'avenant n°1 v0.2 du 5 novembre 2026. Il ajoute une exigence d'expérience utilisateur et de structuration des documents commerciaux et financiers. Il ne supprime aucune exigence métier, de sécurité, de qualité ou de conformité déjà approuvée.

Le cahier des charges applicable est constitué de la v0.1, de l'avenant n°1 v0.2 et du présent avenant n°2 v0.3, lus conjointement. Le présent avenant prévaut uniquement sur le périmètre qu'il traite. Les fichiers PDF et DOCX initiaux v0.1 sont conservés comme références historiques ; ils ne sont pas réécrits.

Les exigences décrites ci-dessous sont des exigences de produit et ne signifient pas que les fonctions sont déjà développées, testées, activées ou disponibles en production. Leur mise en œuvre doit passer par les branches, revues, tests et procédures de livraison habituels.

## 2. Décision produit — une expérience de travail proche d'Excel

Avant la mise en service officielle de PolyGest, la construction des **devis, factures, dépenses et bordereaux de prix unitaires (BPU)** doit être suffisamment fluide pour remplacer, pour les tâches courantes visées, les tableaux Excel utilisés par les entreprises.

Excel constitue ici une référence d'ergonomie et de rapidité, pas une demande de reproduire un tableur généraliste. PolyGest reste une application métier : les champs, calculs, validations, permissions, transitions et journaux d'audit sont contrôlés par les règles de l'application et par le serveur.

L'utilisateur doit pouvoir saisir et modifier des documents composés de plusieurs lignes sans répéter inutilement les mêmes informations, réutiliser les prix et articles connus, visualiser les totaux en continu et produire des documents professionnels.

Cette capacité est une **condition de sortie du MVP avant mise en service**, et non une amélioration facultative à reporter après le lancement.

## 3. Éditeur tabulaire commun

Les écrans de création et de modification des documents concernés doivent proposer un éditeur de lignes cohérent. Sur ordinateur, la présentation privilégie une grille claire et dense, comparable à un tableau de travail. Sur tablette et téléphone, la même capacité fonctionnelle reste disponible dans une présentation adaptée (lignes/cartes éditables, édition guidée ou autre interaction mobile), sans imposer un tableau horizontal illisible.

### 3.1 Colonnes et données de ligne

Selon le type de document, une ligne peut comprendre :
- numéro d'ordre ;
- code ou référence d'article/prestation (notamment référence BPU) ;
- désignation et description ;
- catégorie ou famille ;
- unité ;
- quantité ;
- prix unitaire ;
- remise (type et valeur, si autorisée) ;
- code/règle de taxe applicable, lorsque le module et le régime l'autorisent ;
- montant calculé de la ligne ;
- actions disponibles sur la ligne.

Les champs réellement applicables peuvent varier entre devis, factures, dépenses et BPU. Les colonnes inutiles à un type de document ne sont pas affichées artificiellement.

### 3.2 Manipulation rapide des lignes

L'utilisateur doit pouvoir, selon ses permissions :
- ajouter une ligne, l'insérer entre deux lignes, la supprimer ou la réordonner ;
- dupliquer une ligne pour reprendre rapidement une désignation ou des paramètres ;
- modifier les cellules sans rouvrir un formulaire distinct pour chaque ligne ;
- naviguer au clavier entre les champs, avec un ordre de tabulation prévisible et un focus visible ;
- copier/coller plusieurs cellules ou lignes depuis Excel, LibreOffice Calc ou un tableur compatible, lorsque le navigateur le permet ;
- obtenir un aperçu des données collées/importées et corriger les erreurs avant leur enregistrement.

Le collage ou l'import ne doit jamais enregistrer silencieusement des données invalides. Les erreurs doivent identifier la ligne et le champ concernés.

### 3.3 Calculs et sauvegarde

Les sous-totaux, remises, taxes autorisées et totaux sont recalculés dès que les données pertinentes changent, avec une présentation immédiatement compréhensible. Le navigateur ne constitue jamais l'autorité financière : le serveur recalcule et valide les montants avant leur persistance ou toute transition engageante.

La sauvegarde d'un brouillon doit être explicite ou accompagnée d'un mécanisme d'enregistrement automatique clairement signalé et récupérable. Une erreur réseau ou de validation ne doit pas faire perdre silencieusement le travail saisi.

## 4. Bordereau de prix unitaires (BPU)

PolyGest doit disposer d'un référentiel de prix unitaires réutilisables par entreprise. Le BPU n'est pas une simple feuille de calcul attachée à un devis : il s'agit d'une bibliothèque structurée et recherchable.

### 4.1 Informations minimales

Une entrée BPU doit pouvoir contenir, selon le besoin confirmé :
- code/référence unique dans le périmètre de l'entreprise ;
- désignation détaillée ;
- catégorie ou famille ;
- unité de mesure ;
- prix unitaire de référence et devise ;
- nature du prix (vente, achat ou autre distinction retenue) lorsque nécessaire ;
- date d'effet ou date de mise à jour ;
- état actif/archivé ;
- notes ou source interne de la référence, si utile.

Les taxes ne sont jamais déduites d'un simple prix BPU. Elles sont déterminées par les règles de l'entreprise, le pays, le régime, la date et le document, après validation réglementaire.

### 4.2 Utilisation et conservation des prix

- Les entrées peuvent être recherchées et filtrées par code, désignation, catégorie et état.
- Une ligne BPU sélectionnée peut alimenter une ligne de devis, facture ou dépense pertinente.
- L'utilisateur peut adapter une ligne dans le document si son rôle le permet, sans modifier automatiquement la référence BPU.
- Une mise à jour du BPU ne modifie jamais rétroactivement les devis transmis/acceptés, les factures émises ou les dépenses déjà enregistrées.
- Les documents conservent un instantané des valeurs effectivement utilisées (désignation, unité, prix, devise et paramètres pertinents).
- La création, la modification, l'archivage et l'import du BPU sont soumis aux permissions de l'entreprise et à la traçabilité.

### 4.3 Import et export du BPU

Un modèle de fichier doit permettre de préparer ou d'importer un BPU depuis Excel/CSV. Avant validation, PolyGest présente un aperçu, indique les doublons potentiels, les références invalides, les unités inconnues et les prix incohérents. Aucun remplacement massif du référentiel existant ne se fait sans action explicite et récapitulatif des changements.

L'export Excel/CSV du BPU doit pouvoir être réutilisé pour une mise à jour contrôlée.

## 5. Exigences par module

### 5.1 Devis

La création et la modification d'un devis brouillon utilisent l'éditeur tabulaire commun. L'utilisateur peut ajouter, dupliquer, supprimer et réordonner les lignes, reprendre une référence BPU, saisir une quantité/unité/un prix et voir les calculs.

À la transmission ou à l'acceptation, les données commerciales pertinentes sont figées selon les règles du module. La modification ultérieure du BPU ne modifie pas le devis déjà transmis ou accepté. La conversion en brouillon de facture reprend les lignes et prix du devis source sans réinterprétation silencieuse.

### 5.2 Factures

Les factures autonomes et celles issues d'un devis utilisent le même langage visuel et le même modèle d'édition des lignes, avec les champs et contrôles propres à la facture.

Les factures issues d'un devis reprennent les valeurs convenues dans le document source. Les montants, allocations et soldes de devis sont recalculés et contrôlés côté serveur. Un brouillon ne réduit pas le reste facturable. Une facture émise est figée et les corrections suivent une procédure dédiée.

Aucune présentation de type tableur ne doit contourner les validations fiscales : numérotation légale, taxes/TVA, snapshots, mentions obligatoires, émission, facture normalisée, FEC ou certification ne deviennent disponibles qu'après validation juridique/fiscale et implémentation distincte.

### 5.3 Dépenses

La saisie d'une dépense doit pouvoir gérer une ou plusieurs lignes détaillées. Selon la nature de la dépense, une ligne peut comprendre la désignation, la catégorie, l'unité, la quantité, le prix unitaire, la remise éventuelle et le montant de ligne.

Le document conserve ses informations d'en-tête (date, fournisseur, référence de pièce, devise, moyen de règlement si disponible, notes) et peut être accompagné d'un justificatif privé. Le total est calculé à partir des lignes et contrôlé côté serveur.

L'interface doit distinguer clairement le montant engagé/enregistré, le montant validé et le montant payé dès que ces étapes sont livrées. Un brouillon ou une dépense non payée ne doit pas être présenté comme un décaissement effectif. L'utilisation d'un prix BPU dans une dépense reste une proposition de référence : le prix réellement constaté peut être différent et doit être enregistré sans réécrire le BPU.

### 5.4 BPU et bibliothèque commune

Le BPU est un module identifiable, avec liste, recherche, catégories, fiche, édition contrôlée, import et export. Il est réutilisable depuis les éditeurs de devis, factures et dépenses, sous réserve des compatibilités de nature de prix, d'unité, de devise et de droits.

## 6. Intégrité financière, sécurité et conformité

- Les montants sont persistés et recalculés en types décimaux ; aucun calcul financier ne repose sur `float` ou `double precision`.
- Une règle d'arrondi cohérente, documentée et testée est appliquée au niveau défini par la spécification métier.
- Les totaux reçus du navigateur sont considérés comme non fiables et recalculés côté serveur/base.
- Les prix BPU sont des références commerciales ; ils ne déterminent pas à eux seuls la fiscalité applicable.
- Les paramètres fiscaux sont versionnés par juridiction, régime et date d'effet. Une fonction non validée reste en simulation ou indisponible.
- Les droits de lecture, création, modification, import, export et archivage sont contrôlés par entreprise, rôle et action.
- Les lignes, fichiers importés et identifiants fournis par le navigateur sont validés côté serveur. L'isolation multi-entreprises et RLS s'appliquent à chaque accès.
- Les modifications sensibles (documents, prix de référence, imports, validations, exports sensibles) sont journalisées sans recopier inutilement les données personnelles ou secrets dans le journal.
- Les fichiers Excel/CSV importés sont traités comme des données non fiables. Les formules ne sont jamais exécutées par le serveur ; les macros, liens externes et contenus actifs ne sont pas importés/exécutés.
- L'éditeur respecte le design system PolyGest, le clavier, les lecteurs d'écran, les contrastes et les états de chargement/erreur.

## 7. Import, export et documents de sortie

Le MVP doit permettre les échanges utiles avec les outils de tableur sans transformer PolyGest en logiciel tableur généraliste :
- collage multi-cellules depuis un tableur compatible ;
- import contrôlé CSV et XLSX pour le BPU et, selon les modèles validés, les lignes de documents ;
- export XLSX/CSV des données autorisées pour réutilisation et analyse ;
- génération PDF des devis, factures et états de dépenses selon leur statut et les règles applicables ;
- aperçu avant import, validation champ par champ, compte rendu des lignes importées/rejetées et possibilité de corriger puis relancer.

Les exports respectent les permissions, l'entreprise sélectionnée et les filtres appliqués. Le format de présentation peut être localisé en français/anglais ; la localisation ne change jamais les valeurs enregistrées ni les calculs.

## 8. Exigences non fonctionnelles

- **Rapidité d'usage :** saisie fluide de documents à plusieurs lignes, sans navigation répétitive entre écrans.
- **Précision :** mêmes données d'entrée et mêmes règles donnent les mêmes totaux, quel que soit le navigateur ou la langue.
- **Résilience :** le contenu saisi est préservé en cas d'erreur de validation ou de réseau autant que le permet le mécanisme retenu, avec un état de sauvegarde explicite.
- **Responsive :** toutes les opérations de base restent possibles sur ordinateur, tablette et smartphone.
- **Accessibilité :** utilisation au clavier, ordre de focus cohérent, libellés, erreurs annoncées et focus visible.
- **Internationalisation :** parité FR/EN et formatage explicite des dates/nombres/devises.
- **Performance :** les limites de taille de document et d'import sont définies, mesurées et testées avant lancement ; aucune capacité non éprouvée n'est promise.

## 9. Critères d'acceptation

| ID | Critère | Preuve attendue |
|---|---|---|
| TAB-01 | Ajouter, insérer, dupliquer, supprimer et réordonner une ligne | Tests UI et parcours E2E |
| TAB-02 | Saisir plusieurs lignes sans rouvrir un formulaire par ligne | Test utilisateur sur devis, facture et dépense |
| TAB-03 | Coller plusieurs cellules/lignes depuis Excel ou Calc | Tests de collage, aperçu et validation |
| TAB-04 | Refuser les lignes/cellules invalides sans perte silencieuse | Tests de validation et de reprise |
| TAB-05 | Naviguer au clavier dans la grille avec focus visible | Tests clavier/accessibilité |
| TAB-06 | Calculer lignes, remises, taxes autorisées et total sans écart | Tests unitaires, limites et intégration |
| TAB-07 | Recalculer côté serveur et refuser des totaux falsifiés par le navigateur | Tests de sécurité métier |
| TAB-08 | Rechercher et sélectionner des références BPU | Tests fonctionnels BPU et documents |
| TAB-09 | Importer un BPU CSV/XLSX avec aperçu, doublons et erreurs | Tests d'import contrôlé |
| TAB-10 | Exporter un BPU et des données autorisées en CSV/XLSX | Tests d'export et permissions |
| TAB-11 | Préserver le snapshot d'une ligne après modification du BPU | Test de non-régression historique |
| TAB-12 | Produire une dépense détaillée en plusieurs lignes avec total cohérent | Tests de bout en bout |
| TAB-13 | Reprendre les prix et lignes d'un devis vers un brouillon de facture sans modifier le devis source | Test de conversion |
| TAB-14 | Utiliser les parcours sur mobile sans perte de fonctionnalité essentielle | Tests responsive sur appareils/formats ciblés |
| TAB-15 | Conserver la parité FR/EN des écrans, erreurs, imports et exports | Tests des catalogues et parcours localisés |
| TAB-16 | Respecter RLS, permissions et isolation multi-entreprises | Tests positifs et négatifs par rôle/entreprise |
| TAB-17 | Journaliser les actions sensibles et conserver les historiques requis | Vérification des événements d'audit |
| TAB-18 | Générer des PDF lisibles à partir des données du document, sans les confondre avec une facture légale non validée | Revue documentaire et tests d'export |

Une démonstration visuelle ou une capture d'écran seule ne suffit pas. Les preuves doivent couvrir les données, les calculs, les permissions, les erreurs et les exports.

## 10. Condition obligatoire avant mise en service

La mise en service officielle du MVP est bloquée tant que les critères TAB applicables aux quatre domaines (devis, factures, dépenses et BPU) ne sont pas satisfaits, ou qu'une dérogation écrite n'a pas été explicitement approuvée par le propriétaire avec son risque associé.

Avant le feu vert :
1. spécification détaillée des interactions, colonnes, unités, catégories, modèles d'import/export et permissions ;
2. implémentation progressive par module, avec BPU et éditeur tabulaire partagés lorsque cela réduit réellement les divergences ;
3. tests unitaires, d'intégration, de sécurité, d'isolation, d'accessibilité et E2E ;
4. essais sur base jetable puis sur DEV, avec données de test uniquement ;
5. scénarios d'import/export et rapprochement des totaux avec un tableur de référence ;
6. validation manuelle par le propriétaire sur ordinateur et smartphone ;
7. vérification des règles fiscales/documentaires par un professionnel compétent avant toute émission réelle ;
8. documentation utilisateur et procédure de support pour la saisie, la correction et l'import.

Aucun statut « livré », « testé », « validé » ou « disponible en production » ne peut être déduit de la seule présence d'une maquette ou d'un formulaire.

## 11. Hors périmètre

Le présent avenant ne demande pas :
- de reproduire toutes les fonctions d'Excel (macros, VBA, formules arbitraires, scripts, tableaux croisés dynamiques ou automatisations externes) ;
- d'exécuter les formules ou macros contenues dans les fichiers importés ;
- d'activer immédiatement la facturation légale, la TVA, la certification SECeF/FEC ou une conformité réglementaire non validée ;
- de permettre à un utilisateur de modifier directement les journaux comptables ou l'historique d'un document émis ;
- d'autoriser une modification rétroactive des prix utilisés dans les documents existants ;
- d'introduire une édition collaborative simultanée temps réel sans décision d'architecture distincte.

## 12. Décisions détaillées à préciser avant implémentation

La présente décision fixe l'objectif et le caractère obligatoire de l'expérience type Excel. Le cadrage technique détaillé doit encore préciser, avec des exemples fournis par le propriétaire :
1. les colonnes exactes par type de dépense, devis, facture et BPU ;
2. les unités, catégories et références BPU à gérer ;
3. la distinction éventuelle entre prix d'achat, prix de vente, prix de revient et prix forfaitaires ;
4. les règles de modification d'une ligne après sélection BPU et les droits associés ;
5. les modèles d'import/export XLSX/CSV, gestion des doublons et limites de volume ;
6. les interactions clavier et mobiles prioritaires ;
7. les règles de TVA/taxes et d'arrondi validées par juridiction et régime ;
8. les modèles PDF et les pièces justificatives requises par type de dépense.

Ces décisions détaillées ne remettent pas en cause le principe approuvé : la construction tabulaire des quatre domaines et le BPU constituent un objectif obligatoire avant mise en service.

## 13. Traçabilité et références

Chaque exigence TAB doit être reliée à une issue, des tests et des critères de validation. Les anomalies, décisions et dérogations doivent être conservées dans le suivi du projet.

Références :
- Cahier des charges initial v0.1 : `docs/CAHIER_DES_CHARGES.pdf` et `docs/CAHIER_DES_CHARGES.docx`.
- Avenant n°1 v0.2 — Internationalisation : `docs/CAHIER_DES_CHARGES_AVENANT_INTERNATIONAL_V0.2.md`.
- Feuille de route : `docs/ROADMAP.md`.
- Spécification fonctionnelle Devis et Factures : `docs/SPECIFICATION_FONCTIONNELLE_DEVIS_FACTURES.md`.
- Modèle de données Devis et Factures : `docs/MODELE_DONNEES_DEVIS_FACTURES.md`.
- Norme frontend, sécurité et confidentialité : `docs/FRONTEND_SECURITY_STANDARD.md`.

**Fin de l'avenant n°2 — Version 0.3 — 19 novembre 2026.**
