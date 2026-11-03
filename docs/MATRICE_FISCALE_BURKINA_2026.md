# Matrice fiscale de référence — Burkina Faso (édition 2026)

**Produit :** PolyGest  
**Juridiction :** Burkina Faso  
**Date de cadrage :** 3 novembre 2026  
**Version :** 0.1 — matrice de travail, non validée professionnellement  
**Périmètre :** régimes d'imposition, TVA, facturation normalisée, facture électronique certifiée (FEC), retenues, acomptes, situations de travaux, conservation et contrôles de cohérence  
**Décision d'architecture :** aucun calcul fiscal irréversible ni aucune affirmation de conformité ne peut être activé sur la seule base de ce document.

> **Avertissement impératif.** Ce document est une spécification de recherche et de conception logicielle. Il ne constitue ni un avis juridique, ni un rescrit, ni une consultation fiscale. Il devra être relu par un fiscaliste ou expert-comptable exerçant au Burkina Faso, puis rapproché du CGI 2026 consolidé, de la loi de finances rectificative 2026 et des textes réglementaires/administratifs effectivement en vigueur avant toute mise en production.

---

## 1. Objet, périmètre et méthode

### 1.1 Objectif

Construire un référentiel qui permette à PolyGest de qualifier une entreprise et une opération de facturation sans confondre :

1. le régime d'imposition du fournisseur ;
2. son droit effectif de collecter la TVA ;
3. la qualification fiscale de l'opération (taxable, exonérée, hors champ, taux particulier) ;
4. l'obligation de délivrer une facture et d'utiliser un format normalisé ;
5. l'obligation spécifique d'émettre une FEC au moyen d'un système admis/homologué ;
6. le fait générateur et l'exigibilité de la TVA ;
7. les retenues à la source et retenues de TVA ;
8. les événements commerciaux (devis, livraison, situation, facture, règlement) et leurs conséquences fiscales.

Le produit ne doit pas transformer un seuil de chiffre d'affaires en décision automatique de changement de régime ou de statut TVA. Le logiciel peut détecter un seuil, alerter, demander une preuve et bloquer un scénario lorsque les informations essentielles manquent. La qualification fiscale doit reposer sur les textes applicables et les décisions administratives individuelles lorsqu'elles sont requises.

### 1.2 Périmètre inclus

- entreprises individuelles et personnes morales exerçant une activité au Burkina Faso ;
- régimes CME, RSI, RNI, CSE et RND dans les limites des informations retrouvées ;
- vente de biens, prestations de services et travaux immobiliers ;
- devis, factures, acomptes, situations, factures de solde et avoirs ;
- TVA collectée, retenues de TVA et retenues sur paiements ;
- facture normalisée, FEC et conservation des justificatifs ;
- paiement scriptural et alertes liées au seuil légal de paiement en espèces ;
- historique des règles et auditabilité des décisions du moteur fiscal.

### 1.3 Hors périmètre de cette édition

Cette matrice ne prétend pas couvrir exhaustivement :
- impôt sur les sociétés, impôt sur les bénéfices industriels et commerciaux, minimum forfaitaire, patente et taxes locales ;
- fiscalité douanière complète, accises et commerce extérieur ;
- fiscalité minière et pétrolière ;
- retenues sociales, cotisations CNSS, paie et droit du travail ;
- règles OHADA comptables complètes, états financiers et déclarations de résultat ;
- fiscalité des opérations transfrontalières complexes, établissements stables, prix de transfert et conventions fiscales ;
- régime complet des associations, ONG, projets, organismes internationaux et entités publiques ;
- homologation de PolyGest comme système de facturation d'entreprise.

Toute fonction relevant de ces sujets doit rester non disponible ou explicitement marquée « hors périmètre / validation spécialisée ».

---

## 2. Hiérarchie des sources et niveau de confiance

### 2.1 Ordre de priorité juridique

Pour décider d'une règle, suivre cette hiérarchie :

1. **Loi et Code général des impôts (CGI)** : texte législatif applicable, dans sa version consolidée et à la date de l'opération.
2. **Décrets, arrêtés et textes réglementaires** pris pour l'application du CGI.
3. **Instructions, notes et communiqués officiels de la DGI** : interprétation et consignes opérationnelles, dans les limites de leur portée juridique.
4. **FAQ et pages pratiques DGI** : utiles pour guider les contrôles et expliquer les démarches, mais ne remplacent pas la loi.
5. **Communiqués institutionnels du ministère et de l'Assemblée législative** : utiles pour les étapes d'adoption et l'annonce des mesures ; ne remplacent pas le texte promulgué.
6. **Presse professionnelle et commentaires** : uniquement comme signal de recherche ou corroboration, jamais comme source unique d'une règle codée.

En cas de divergence, le texte légal consolidé et les actes réglementaires applicables priment sur une FAQ, une ancienne instruction ou un article de presse. Une contradiction non résolue doit produire un état « revue fiscale requise », pas une règle par défaut.

### 2.2 Codes de preuve utilisés dans les matrices

| Code | Niveau | Sens |
|---|---|---|
| **L1** | Texte législatif consulté | Article de loi ou du CGI consulté directement dans une source officielle. |
| **L2** | Texte réglementaire consulté | Arrêté ou décret officiel consulté directement. |
| **A1** | Source administrative officielle | Page, FAQ, instruction ou communiqué DGI consulté. |
| **A2** | Information institutionnelle annoncée | Communication du ministère ou de l'Assemblée ; le texte juridique détaillé doit encore être rapproché. |
| **S1** | Source secondaire | Presse ou commentaire professionnel ; ne suffit pas à activer une règle. |
| **À confirmer** | Lacune ou conflit | Texte consolidé, disposition d'entrée en vigueur, exception ou champ exact non établi. |

### 2.3 Versions réglementaires : règle de gouvernance

Toute règle exploitable doit comporter :
- juridiction et pays ;
- référence de texte, article et paragraphe ;
- nature de la source (loi, CGI, arrêté, instruction) ;
- date de publication et date d'entrée en vigueur ;
- date de fin d'effet, si connue ;
- opérations et catégories de contribuables visées ;
- conditions et exceptions ;
- lien vers le document source archivé ;
- empreinte ou identifiant de version du document archivé ;
- date de dernière revue ;
- personne ayant validé la règle ;
- état : brouillon, vérifié sur source, validé professionnellement, retiré.

Ne jamais écraser une ancienne version fiscale. Une facture émise en 2025 doit garder la règle qui lui était applicable à la date de l'opération, même après une modification du CGI en 2026.

---

## 3. Point de vigilance réglementaire majeur : loi de finances rectificative 2026

Le projet de loi portant loi de finances rectificative (LFR) 2026 a été adopté en séance plénière le **23 septembre 2026**, selon le compte rendu de l'Assemblée législative du Peuple. Le ministère de l'Économie et des Finances a publié le 25 septembre 2026 une communication présentant les mesures fiscales prévues par le texte. Ces deux éléments établissent l'adoption parlementaire du projet et la communication gouvernementale sur les mesures annoncées ; ils ne remplacent pas la loi promulguée ni sa publication au Journal officiel.

Les mesures annoncées incluent notamment :
- exonération de retenue à la source sur certaines primes versées à des sociétés de réassurance établies dans les États membres de la CIMA ;
- exonération de TVA sur les opérations de sécurisation, confection et pose de plaques d'immatriculation ;
- exonération de TVA sur certaines matières premières utilisées pour fabriquer des aliments pour animaux ;
- exonération de TVA sur les opérations des entreprises de réassurance ;
- exonération de TVA sur des produits laitiers fabriqués localement à partir de lait d'origine locale ;
- modification du régime fiscal des boissons non alcoolisées ;
- rétablissement d'incitations fiscales et douanières au profit des PME.

**Statut de vérification au 3 novembre 2026 :** l'adoption parlementaire du projet et les mesures annoncées sont confirmées par des sources institutionnelles. La page officielle « Lois » de la DGI répertorie le CGI 2026 et le Journal officiel spécial de la loi de finances initiale 2026, mais la liste consultée ne présente pas de fichier intitulé « loi de finances rectificative 2026 ». La copie intégrale de la LFR promulguée, son numéro, sa date de promulgation/publication et les dates d'effet de ses dispositions n'ont pas été obtenus dans le dossier de recherche. Il ne faut donc ni affirmer que la promulgation est établie, ni conclure qu'elle n'a pas eu lieu : le statut documentaire demeure non vérifié.

Les mesures annoncées par le ministère ne doivent pas être codées comme exonérations directement applicables sur la seule base d'un communiqué. Il faut retrouver le texte promulgué, vérifier les articles définitifs, les bénéficiaires, les biens/opérations visés, les conditions, les pièces justificatives, les dates d'effet et les dispositions transitoires.

**Blocage P0 :** obtenir et archiver la LFR promulguée et le Journal officiel correspondant, puis comparer article par article le CGI 2026 et ses modifications. Le site DGI affiche un accès intitulé « Code général des impôts 2026 » ; cet accès doit être téléchargé et archivé avec son identité/version, car le simple référencement sur le site n'est pas encore une preuve que le fichier source a été intégré au dépôt.

---

## 4. Matrice des régimes d'imposition

### 4.1 Vue d'ensemble

Les pages de la DGI distinguent cinq catégories principales : régime du réel normal d'imposition (RNI), régime du réel simplifié d'imposition (RSI), contribution des micro-entreprises (CME), contribution spéciale du secteur de l'élevage (CSE) et régime du non-déterminé (RND).

| Régime | Profil général | Seuil ou rattachement indicatif | TVA facturée par le fournisseur | Décision PolyGest |
|---|---|---|---|---|
| RNI | Activité relevant du réel normal | CA annuel HT généralement ≥ 50 000 000 FCFA, sous réserve du CGI et des situations particulières | Oui, pour les opérations taxables et sous réserve du statut effectif | Exiger preuve de régime/statut et dates d'effet |
| RSI | Activité au réel simplifié | 15 000 000 ≤ CA annuel HT < 50 000 000 FCFA, sous réserve des exclusions/conditions | Non, sauf option RNI acceptée et devenue effective | Bloquer la TVA ordinaire si aucune décision d'option valide n'est enregistrée |
| CME | Petite activité indépendante éligible | CA annuel HT inférieur à 15 000 000 FCFA, sous réserve des exclusions | Non | Sous-régime et éligibilité à documenter |
| CSE | Activités sectorielles relevant de l'élevage et activités assimilées | Dépend de la nature des produits/activités et du CGI | Ne pas déduire du seul nom du régime | Questionnaire sectoriel et validation |
| RND | Personnes/entités relevant du régime non déterminé ou de situations particulières visées par les textes | Catégorie spécifique, pas une tranche générale de chiffre d'affaires commercial | Ne pas déduire un droit de collecte à partir de cette seule étiquette | Traitement spécialisé, validation obligatoire |

**Important :** les seuils ne remplacent ni les règles d'éligibilité ni le rattachement fiscal officiel. Le régime sélectionné par l'utilisateur doit être étayé par une pièce fiscale, un document administratif ou une confirmation vérifiable.

### 4.2 Régime du réel normal (RNI)

La DGI décrit le RNI comme applicable en principe aux entreprises dont le chiffre d'affaires annuel hors taxes est égal ou supérieur à 50 000 000 FCFA. La page DGI mentionne :
- l'ajustement au prorata temporis pour une activité créée en cours d'année ;
- le passage possible vers le RSI après trois années consécutives sous le seuil applicable ;
- la tenue d'une comptabilité selon le système normal du SYSCOHADA ;
- des obligations déclaratives mensuelles ;
- la capacité des contribuables au RNI à facturer la TVA lorsque l'opération est taxable.

**Règles PolyGest :**
1. Le seuil est un indicateur de rattachement, pas un changement automatique de régime.
2. Enregistrer la date de début d'activité et la période de calcul du prorata.
3. Stocker la preuve de RNI et la période de validité.
4. Distinguer le régime RNI du statut de collecte TVA : même dans le RNI, l'opération peut être exonérée ou hors champ.
5. Les obligations déclaratives mensuelles ne doivent pas être présentées comme accomplies par PolyGest tant qu'un module déclaratif validé n'existe pas.

**Niveau :** page officielle DGI (A1) ; conditions détaillées à relire dans le CGI 2026 consolidé avant activation.

### 4.3 Régime du réel simplifié (RSI)

L'article 529, réécrit par l'article 27 de la loi n°021-2025/ALT du 27 décembre 2025 portant loi de finances pour l'exécution du budget de l'État, exercice 2026, prend effet au 1er janvier 2026. Le texte publié au Journal officiel fixe la tranche générale de CA annuel HT entre 15 000 000 FCFA inclus et 50 000 000 FCFA exclu. Il prévoit également que les contribuables personnes physiques ou morales exclus de la CME et qui ne remplissent pas les conditions d'admission au RNI relèvent du RSI. Les autres points explicitement prévus sont :
- prorata temporis des seuils pour les exploitants qui commencent leurs activités en cours d'année ;
- caducité systématique du RSI en cas de dépassement du seuil supérieur en cours d'année ;
- obligation d'informer l'administration dans un délai de 30 jours ;
- maintien sous RSI, avant éventuel passage en CME, lorsque le CA HT demeure inférieur au seuil limite pendant trois années consécutives, dans les conditions du texte.

La DGI précise que :
- le RSI ne permet pas, à lui seul, de facturer la TVA ;
- une option pour le RNI peut être sollicitée dans les conditions prévues ;
- la demande d'option doit être présentée dans le délai administratif indiqué (notamment avant le 1er février selon la page DGI) ;
- l'entreprise doit satisfaire aux conditions fiscales, comptables et déclaratives demandées ;
- l'option n'est effective qu'après acceptation de l'administration ;
- la DGI indique que l'option acceptée prend effet au 1er janvier de l'année concernée et est irrévocable pendant trois ans.

**Règles PolyGest :**
- Une demande d'option déposée ne vaut pas acceptation.
- Le droit de collecter la TVA ne doit être activé qu'après enregistrement de la décision d'acceptation, de sa date d'effet et des justificatifs.
- Un dépassement de CA entraîne une alerte immédiate, une échéance de suivi de 30 jours et une demande de mise à jour du profil. Le moteur ne doit pas inventer le régime de remplacement ni réécrire les factures antérieures.
- L'échéance « trois années consécutives sous le seuil » doit être calculée sur des exercices validés, pas sur des totaux de factures partiels.

**Niveau :** article 529 LFI 2026 (L1) et page DGI (A1). Vérification finale avec le CGI 2026 consolidé requise.

### 4.4 Contribution des micro-entreprises (CME)

La DGI décrit la CME comme un régime applicable à des activités indépendantes éligibles sous le seuil annuel de 15 000 000 FCFA, avec des exclusions, notamment certaines professions libérales et les activités relevant de la CSE.

La page DGI distingue deux modalités :
- CME forfaitaire ;
- CME déclarative.

Répartition publiée pour les personnes physiques :
- CA inférieur à 5 000 000 FCFA : CME forfaitaire ;
- CA à partir de 5 000 000 FCFA et inférieur à 15 000 000 FCFA : CME déclarative.

Pour les personnes morales éligibles, la page DGI indique la CME déclarative sous 15 000 000 FCFA.

La DGI indique également :
- l'absence de facturation de TVA sous CME ;
- la caducité de la CME si le seuil de 15 000 000 FCFA est dépassé ;
- l'obligation d'informer l'administration dans les 30 jours ;
- une possibilité d'option vers le RSI sous conditions.

**Règles PolyGest :**
1. La forme juridique, l'activité et les exclusions doivent être vérifiées avant de proposer la CME.
2. Ne pas appliquer automatiquement le forfait à une personne morale.
3. Ne pas appliquer la CME aux professions exclues ou aux activités sectorielles relevant d'un régime particulier.
4. Ne pas afficher la TVA collectée sur une facture d'un fournisseur sous CME.
5. À l'approche ou au dépassement du seuil, créer une alerte et demander un document actualisé.

**Niveau :** page DGI/FAQ officielle (A1). Vérifier les articles et exclusions précis dans le CGI 2026 consolidé et la LFR 2026.

### 4.5 Contribution spéciale du secteur de l'élevage (CSE)

La CSE est un régime sectoriel. La loi de finances initiale 2026 a modifié l'article 548 du CGI et décrit un prélèvement synthétique représentatif de taxes liées notamment à la vente de bétail, de volailles, de peaux brutes, de poissons et de produits de l'aquaculture.

**Règles PolyGest :**
- Ne pas assimiler la CSE à une simple tranche de chiffre d'affaires.
- Exiger la qualification de l'activité et des produits.
- Séparer l'activité CSE des autres activités d'une même entreprise si le droit fiscal l'exige.
- Ne pas appliquer un taux ou une assiette à partir d'une description libre saisie par l'utilisateur.
- Toute entreprise mixte (activité CSE et autre commerce/service) doit être renvoyée en revue fiscale tant que le traitement des activités distinctes n'est pas confirmé.

**Niveau :** article 548 modifié par LFI 2026 (L1), portée détaillée à valider dans le CGI consolidé.

### 4.6 Régime du non-déterminé (RND)

La DGI définit le RND comme la catégorie des contribuables qui ne sont classés ni au RNI, ni au RSI, ni à la CME, ni à la CSE. À titre illustratif, la page DGI mentionne notamment les organisations non gouvernementales, associations, projets et programmes, fondations, institutions et administrations publiques, collectivités territoriales, établissements publics, organismes internationaux, missions diplomatiques, bailleurs, salariés des secteurs public et privé et particuliers.

La DGI précise que les sommes perçues par les contribuables relevant du RND à l'occasion d'opérations de toute nature, quel qu'en soit le montant, sont soumises à une retenue à la source libératoire (article 220 du CGI, sous réserve des règles de taux et de recouvrement applicables). Les entités RND qui réalisent des ventes de biens ou prestations de services de façon récurrente sont susceptibles d'être reclassées dans un régime de droit commun. Le statut RND ne doit donc pas être assimilé à une simple tranche de petit chiffre d'affaires.

**Règles PolyGest :**
- Le RND ne doit pas être proposé comme régime commercial ordinaire à une entreprise exerçant une activité professionnelle récurrente.
- Le profil doit enregistrer la catégorie exacte (association, ONG, organisme public, salarié, particulier, opération occasionnelle ou autre catégorie visée) et le fondement de rattachement.
- Pour les recettes d'un fournisseur RND, prévoir un contrôle de retenue libératoire selon les articles 220 à 222 et la nature du bénéficiaire.
- Distinguer le RND du fournisseur du statut RND du client : le second peut entraîner des contrôles distincts liés à la réception FEC.
- Ne pas appliquer automatiquement à toute entité citée à titre illustratif une même retenue, un même taux ou une même obligation FEC.
- En présence d'opérations récurrentes, demander une revue de classification et conserver la décision de l'administration.

**Niveau :** page officielle DGI (A1) pour la définition et les exemples ; articles 220 à 222 du CGI et rédaction consolidée 2026 à vérifier avant d'activer le traitement.

---

## 5. Statut TVA : dimension indépendante du régime fiscal

### 5.1 États internes du profil TVA

Ces états sont des états applicatifs et ne sont pas des catégories légales :

| État applicatif | Signification | Conséquence |
|---|---|---|
| `unverified` | Aucun justificatif ou qualification suffisante | Émission fiscale définitive bloquée |
| `not_authorized_to_collect` | Fournisseur non autorisé à porter de TVA collectée | Interdire la TVA ordinaire sur ses factures |
| `authorized_to_collect` | Droit confirmé pour la période et les opérations visées | Autoriser le calcul sous réserve de la qualification de l'opération |
| `special_case_review` | Option, exonération, activité mixte ou règle spéciale | Validation humaine |
| `suspended_or_expired` | Justificatif expiré, suspendu ou période dépassée | Revalidation requise |

Ne jamais afficher ces états techniques comme s'il s'agissait des statuts réglementaires officiels.

### 5.2 Règle publiée pour les régimes

La DGI indique que les contribuables du RNI sont habilités à facturer la TVA. Les contribuables du RSI peuvent y accéder seulement après option acceptée et basculement effectif vers le RNI. Les contribuables sous CME ne facturent pas la TVA selon la documentation DGI.

Cela ne signifie pas que toute opération facturée par un RNI supporte automatiquement 18 % : il faut aussi examiner le champ TVA, les exonérations, le taux réduit et les règles sectorielles.

### 5.3 Ne pas confondre trois situations

| Situation | Traitement conceptuel | Traitement sur facture |
|---|---|---|
| Fournisseur non autorisé à collecter la TVA | Absence de droit de collecte | Total dû sans ligne de TVA artificielle à 0 % |
| Opération exonérée | Opération entrant dans un cadre fiscal mais dispensée de TVA par un texte | Mention d'exonération et référence juridique, si exigées |
| Opération hors champ | Opération ne relevant pas du champ de la TVA | Ne pas la coder comme exonération ; afficher la mention appropriée uniquement après validation |

---

## 6. Matrice des opérations et taux de TVA

### 6.1 Taux de référence retrouvés

| Traitement | Taux ou résultat | Conditions | Statut |
|---|---:|---|---|
| Taux normal | 18 % | Opération taxable et fournisseur autorisé à collecter | LFI 2025 à rapprocher du CGI 2026 consolidé |
| Taux réduit | 10 % | Hébergement/restauration par établissements agréés visés par le texte | Éligibilité et agrément à prouver |
| Taux réduit | 10 % | Transport aérien domestique selon la disposition de la LFI 2025 consultée | À rapprocher du CGI 2026 consolidé |
| Exonération | Aucun montant de TVA collectée | Texte d'exonération précis et conditions satisfaites | Justificatif et référence obligatoires |
| Hors champ | Non applicable | Qualification juridique de l'opération | Validation nécessaire |
| TVA non collectée par le fournisseur | Pas de TVA facturée | Fournisseur non autorisé à collecter | Profil fournisseur vérifié |

Le taux de 10 % ne doit jamais être proposé comme taux librement sélectionnable pour toute prestation. Il doit être lié à un code d'opération précis, aux conditions légales et, lorsque requis, à un justificatif d'agrément.

### 6.2 Mesures annoncées dans la LFR 2026

Le ministère a annoncé des exonérations portant notamment sur les plaques d'immatriculation, certains intrants pour aliments pour animaux, les opérations de réassurance et certains produits laitiers d'origine locale.

**Ne pas créer ces exonérations dans le moteur avant d'avoir lu la loi promulguée** : il faut obtenir les articles finaux, les définitions des biens et opérations concernés, les bénéficiaires, les conditions d'origine, les justificatifs, les dates d'effet et les éventuelles limites temporelles.

### 6.3 Données de calcul

Les calculs doivent utiliser des types décimaux exacts (PostgreSQL `numeric` ou représentation entière en unité monétaire/subdivision selon le modèle validé), jamais des nombres flottants binaires.

Pour chaque ligne d'une facture :
- quantité ;
- unité ;
- prix unitaire ;
- remise ;
- base HT ;
- catégorie fiscale de l'opération ;
- règle de taux applicable ;
- code de traitement TVA ;
- taux et montant de TVA si applicables ;
- montant TTC ;
- référence et version de la règle fiscale.

Les arrondis doivent être déterminés par une règle écrite et testée. Le moteur doit conserver les montants intermédiaires et la méthode d'arrondi. Le choix « arrondi par ligne » ou « arrondi au total » ne doit pas être improvisé ; il doit être aligné sur le texte et la pratique comptable validée.

---

## 7. Facture, facture normalisée et mentions obligatoires

### 7.1 Obligation de délivrer une facture

L'article 562 du CGI (version consultée dans le Code 2023) exige une facture pour les opérations des industriels, commerçants, prestataires de services et établissements publics à caractère industriel ou commercial, quel que soit leur régime d'imposition, sous réserve des dispositions particulières.

La DGI rappelle dans son instruction administrative du 7 octobre 2020 une portée large de l'obligation, incluant notamment les importateurs, producteurs et entrepreneurs de travaux immobiliers.

**Réserve :** la portée et les formulations exactes doivent être revérifiées dans le CGI 2026 consolidé et les modifications de la LFI/LFR 2026.

### 7.2 Noyau de mentions à prévoir

Sur la base de l'article 562 consulté dans le Code 2023, préparer les champs suivants, à confirmer selon la version 2026 et le document concerné.

**Émetteur**
- nom/prénoms ou dénomination ;
- forme juridique le cas échéant ;
- adresses géographique, cadastrale et postale ;
- téléphone ;
- IFU ;
- numéro RCCM ou registre professionnel applicable ;
- références bancaires dans les cas où elles sont exigées ;
- régime d'imposition ;
- service des impôts de rattachement.

**Client**
- nom/prénoms ou dénomination ;
- adresses et coordonnées requises ;
- RCCM ou registre professionnel lorsque requis ;
- IFU pour les personnes morales et commerçants selon les dispositions applicables.

**Transaction**
- numéro dans une série ininterrompue ;
- date d'émission ;
- objet précis et désignation des biens, services ou travaux ;
- quantités, prix et montant ;
- base HT et ventilation fiscale si applicable ;
- montant de TVA si applicable ;
- total TTC ou total dû ;
- motif d'exonération lorsque nécessaire.

**Règle de sécurité :** les données légales d'identification du vendeur doivent provenir d'un profil d'entreprise vérifié. Une facture ne doit pas être émise avec un IFU fictif, un RCCM inventé ou un service fiscal supposé.

### 7.3 Facture normalisée et modernisation du dispositif

Les articles 564 à 566 du CGI encadrent la facture normalisée et les dispenses. La DGI a publié des instructions sur les mentions de l'article 562 et sur les modalités de facture normalisée. Les instructions anciennes relatives à une période transitoire (notamment l'instruction de 2020 concernant le support préimprimé) ne doivent pas être considérées comme règle universelle actuelle sans vérifier les actes plus récents, notamment l'arrêté n°2023-215/MEFP/SG/DGI et le dispositif FEC.

**Décision PolyGest :** séparer :
- contenu commercial/fiscal de la facture ;
- modèle documentaire/rendu ;
- obligation de normalisation applicable à l'émetteur ;
- statut de certification FEC ;
- justificatifs et preuves.

### 7.4 Dispenses de facture normalisée et dispenses FEC

L'article 566 doit être lu paragraphe par paragraphe. La liste de dispenses de facture normalisée n'est pas automatiquement identique à celle des dispenses de FEC.

La liste historique consultée dans le Code 2023 mentionne notamment certaines entités publiques non commerciales, entreprises sans établissement stable au Burkina Faso, ventes de détail donnant lieu à tickets, pharmacies, navigation aérienne, transports urbains avec tickets, stations-services pour carburant, banques/établissements financiers/SFD, assurances, concessionnaires publics d'eau/électricité, téléphonie, certains abonnements de télévision et plusieurs organismes spécifiquement cités.

La loi de finances 2025 a été signalée comme ayant ajouté une catégorie liée aux fournisseurs d'accès Internet par fibre optique pour les abonnements/réabonnements de particuliers. La rédaction exacte et l'entrée en vigueur doivent être confirmées dans la loi et le CGI 2026 consolidés avant d'intégrer cette dispense.

**Règles PolyGest :**
- aucun utilisateur ne choisit « dispensé » sans sélection contrôlée d'un fondement ;
- chaque dispense est liée à une période, une opération, un motif et une preuve ;
- les dispenses de facture normalisée et de FEC sont deux référentiels séparés ;
- une exception applicable au vendeur n'est pas automatiquement applicable à l'acheteur.

---

## 8. FEC et systèmes électroniques certifiés (SECeF/SFE)

### 8.1 Définitions à respecter

L'arrêté n°2025-0049/MEF/SG/DGI du 5 février 2025 définit notamment :
- la facture électronique certifiée ;
- les SECeF physiques (unité de facturation et module de contrôle de facturation) ;
- le système de facturation d'entreprise (SFE) ;
- l'homologation et l'attestation de conformité.

Une FEC doit être produite dans le cadre du dispositif prévu, avec les mentions et éléments de sécurité requis. Un PDF standard, un QR code créé par PolyGest ou une facture électronique non certifiée ne constitue pas par lui-même une FEC.

### 8.2 Assujettissement et articulation entre la loi et le déploiement opérationnel

L'article 44 de la loi n°042-2024/ALT portant loi de finances pour l'exécution du budget de l'État, exercice 2025, modifie l'article 564 du CGI avec effet au **1er janvier 2025** :
- le paragraphe 1 maintient l'obligation d'utiliser des factures normalisées, dont les conditions d'édition, de gestion et les éléments de sécurité sont fixés par arrêté ;
- le paragraphe 2 prévoit que les contribuables relevant de la DGE et des DME délivrent exclusivement une FEC à leur client ou un document tenant lieu de FEC ;
- la définition légale de la FEC renvoie à un système électronique certifié de facturation homologué par l'administration fiscale et prévoit notamment un numéro SECeF, un code d'authentification et un QR code.

Il faut distinguer trois dates qui ne sont pas interchangeables :
1. la date d'entrée en vigueur de la règle législative (1er janvier 2025, selon l'article 44) ;
2. les dates de mise à disposition ou de commercialisation des équipements et systèmes par l'administration ;
3. les échéances opérationnelles, périodes transitoires ou catégories précises fixées par les communications et actes d'application de la DGI.

Les annonces de déploiement différenciées publiées en 2026 ne doivent donc pas être interprétées comme une modification implicite de la date législative. La portée concrète, les modalités transitoires et les sanctions ne peuvent être automatisées qu'après rapprochement de la loi, des arrêtés et des communiqués DGI applicables à la catégorie du contribuable.

L'article 44 précise que les conditions d'émission, la commercialisation des systèmes et les documents tenant lieu de FEC sont déterminés par arrêté. L'arrêté n°2025-0049 du 5 février 2025 constitue le texte réglementaire de référence identifié pour les conditions d'émission.

L'article 45 de la même loi de finances 2025 modifie l'article 566 :
- le paragraphe 1 énumère les dispenses de facture normalisée ;
- le paragraphe 2 établit une liste distincte de contribuables relevant de la DGE dispensés de FEC : État, collectivités et établissements publics sans activité industrielle ou commerciale ; entreprises sans établissement stable au Burkina Faso ; sociétés de navigation aérienne ; entreprises de transport urbain de personnes avec délivrance de tickets.

La liste des dispenses de facture normalisée n'est donc pas la liste des dispenses de FEC. Il ne faut pas étendre automatiquement une dispense du paragraphe 1 au paragraphe 2.

L'arrêté relatif aux documents tenant lieu de FEC traite d'une catégorie encore différente : des documents expressément admis comme justificatifs de transaction dans les cas prévus par l'arrêté. Ces documents ne sont pas des FEC certifiées, même s'ils peuvent en tenir lieu légalement.

PolyGest doit donc gérer deux questions indépendantes :
1. le fournisseur est-il obligé d'émettre une FEC ?
2. le client est-il soumis à une obligation ou à une exigence de réception FEC ?

Ne pas extrapoler toutes les dispenses de facture normalisée aux dispenses de FEC. Vérifier les dispositions spécifiques de l'article 566, paragraphe 2, et de l'arrêté.

### 8.3 Documents tenant lieu de FEC

L'arrêté distinct relatif aux documents tenant lieu de FEC prévoit des justificatifs admis expressément par l'administration fiscale. Il ne s'agit pas d'une extension implicite des dispenses de facture normalisée de l'article 566. La liste publiée comprend notamment :
- les factures et documents assimilés émis avant la date d'entrée en vigueur de l'obligation d'émission des FEC ;
- les factures de fournisseurs et prestataires étrangers sans établissement stable au Burkina Faso ;
- les documents douaniers ;
- les titres de perception et avis d'imposition ;
- certains bordereaux de réception pour les achats auprès d'agriculteurs vendant au bord champ leur production ;
- certains bordereaux de réception d'agrégats pour les entreprises du BTP ;
- certains bordereaux de réception d'achats effectués par les restaurateurs pour les besoins de leur cuisine ;
- certains bordereaux de réception de ferraille et plastiques usagés achetés auprès d'individus pour recyclage ;
- les factures et documents assimilés provenant de personnes bénéficiant d'une exonération.

Les conditions de validité, les mentions exigées et le champ de chaque catégorie doivent être lus dans l'arrêté intégral. PolyGest doit identifier ces pièces comme « document tenant lieu de FEC » uniquement lorsque les conditions de l'arrêté sont satisfaites ; ne pas les qualifier de FEC certifiée.

### 8.4 Obligations matérielles et opérationnelles

L'arrêté prévoit, pour les utilisateurs de systèmes physiques, des obligations concernant :
- équipement du ou des points de vente ;
- affichage visible de l'information destinée aux clients ;
- émission systématique pour les transactions ;
- dispositif de remplacement ;
- accès aux contrôles ;
- régularisation de certaines ventes non facturées en cas de panne ou d'irrégularité dans les délais prévus ;
- maintenance et connectivité ;
- règles de dépose/désactivation du matériel ;
- support d'impression et lisibilité.

Ces obligations ne peuvent pas être satisfaites par le seul module PDF d'un SaaS.

### 8.5 Calendrier de déploiement — prudence

La DGI a publié des communiqués sur le déploiement des SECeF, et un communiqué du 29 octobre 2026 intitulé « Utilisation obligatoire des SECeF par les grandes entreprises ». Des annonces opérationnelles ont notamment mentionné un calendrier différencié DGE / DME selon les catégories de contribuables.

Toutefois, la date d'annonce, la mise à disposition d'un matériel et la date d'obligation légale ne sont pas nécessairement la même chose. La copie intégrale des communiqués applicables, leur champ exact, les périodes transitoires et les catégories concernées doivent être archivés avant d'afficher une échéance ou un blocage automatique. La date du 1er janvier 2027 annoncée pour la DGE doit être vérifiée directement dans le communiqué officiel intégral.

### 8.6 Sanctions liées à la normalisation et à la FEC

La loi de finances 2025 introduit les articles 798-1 et 798-2 du CGI, avec effet au 1er janvier 2025.

**Facture normalisée — article 798-1 :**
- amende de 100 000 FCFA par facture normalisée non conforme au paragraphe 1 de l'article 564 ou comportant des mentions inexactes.

**FEC — article 798-2 :**
- défaut d'émission par une personne soumise à l'obligation : amende égale à cinq fois le montant de TVA compromis, avec un minimum de 500 000 FCFA ;
- récidive : dix fois la TVA compromise, avec un minimum de 1 000 000 FCFA ;
- possibilité de fermeture administrative de dix jours renouvelables ;
- les sanctions s'appliquent aussi à une personne causant un dysfonctionnement du système électronique certifié ;
- fournisseur d'un SFE non homologué : amende de 1 000 000 FCFA, portée à 2 000 000 FCFA en cas de récidive ;
- même sanction pour une entreprise ayant développé son propre système sans homologation ;
- modification du SFE ou usurpation d'identité destinée à émettre des FEC frauduleuses/falsifiées : amende de 2 000 000 FCFA par facture, sans préjudice des sanctions pénales.

Ces montants sont reproduits à des fins de conception et d'information. Leur application à un cas concret, la qualification de la récidive, la base de calcul de la TVA compromise et les garanties procédurales exigent la lecture de l'article 798-2 complet et une validation professionnelle. PolyGest ne doit pas calculer automatiquement une amende fiscale comme créance certaine.

### 8.7 Position produit

Tant que PolyGest n'a pas reçu l'homologation/attestation correspondante :
- ne jamais afficher « FEC certifiée », « homologuée DGI » ou équivalent ;
- ne jamais générer soi-même un code d'authentification, QR code fiscal ou identifiant SECeF fictif ;
- ne jamais marquer une facture « certifiée » avant retour positif du système certifié ;
- ne pas prétendre couvrir les obligations matérielles de l'UF/MCF ;
- concevoir éventuellement un adaptateur séparé vers un système certifié, en utilisant seulement les spécifications et accès officiellement fournis.

Une fonction de préparation de données de facture peut exister indépendamment de la certification, avec un statut explicite « non certifiée ».

---

## 9. Fait générateur et exigibilité de TVA

### 9.1 Notions

- **Fait générateur :** événement qui fait naître la créance fiscale dans les conditions du CGI.
- **Exigibilité :** moment où le Trésor peut réclamer la taxe et où les obligations de déclaration correspondantes s'appliquent.

Les articles 315 et 316 doivent être lus ensemble. Ne pas déduire l'exigibilité du seul statut commercial « facture payée ».

### 9.2 Matrice indicative fondée sur les articles consultés

| Nature de l'opération | Fait générateur | Exigibilité / contrôle logiciel |
|---|---|---|
| Livraison de biens | Livraison effective | En principe à la livraison ; une facture émise avant la livraison peut avancer l'exigibilité selon l'article 316 |
| Prestation de services | Accomplissement de la prestation | En principe à l'accomplissement ; avance/acompte encaissé peut rendre la TVA exigible sur la somme reçue |
| Prestation relevant de certains redevables IBNC | Règle particulière | Exigibilité liée à l'encaissement du prix du service, selon la disposition applicable |
| Travaux immobiliers | Exécution des travaux | Avances et acomptes reçus peuvent rendre la TVA exigible sur la portion encaissée avant achèvement |
| Travaux donnant lieu à décomptes périodiques | Périodes/décomptes visés par les textes | Stocker les décomptes, dates d'exécution, événements d'avance et dates de paiement |
| Importation | Dédouanement/mise à la consommation | Règles douanières ; ne pas calculer à partir d'une facture commerciale seule |
| Services/biens immatériels de non-résident | Règles spécifiques liées à la facture/comptabilisation | Revue fiscale et potentielle autoliquidation/retenue selon la situation |
| Livraison à soi-même | Première utilisation | Cas spécialisé ; validation nécessaire |
| Opération avec entité publique | Règle spécifique possible de report ou de retenue | Contrôler visa/autorisation, qualité du client et texte applicable avant calcul |

6) Pour les fournitures ou livraisons à l'État, aux collectivités territoriales ou à leurs démembrements n'ayant pas un caractère industriel ou commercial, l'article 316 prévoit qu'un différé de paiement de la TVA peut être accordé par le service des impôts jusqu'au paiement par les services du Trésor public. Le montant dû est alors retenu à la source par le service chargé du paiement, au taux indiqué par le service des impôts lors du visa des décomptes, du marché ou du contrat. À défaut de visa, le texte prévoit une pénalité de 25 % en cas de mauvaise foi et de 200 % en cas de manœuvres frauduleuses, sur les droits dus.

Cette disposition doit être traitée séparément :
- de la retenue sur commandes publiques prévue aux articles 226-1 et suivants ;
- de la retenue de 30 % sur la TVA prévue à l'article 334, paragraphe 4, issue de la LFI 2026 ;
- des retenues sur prestations ou bénéficiaires RND.

La présence d'un marché public ne permet pas de cumuler automatiquement ces retenues. L'identité du payeur, le statut du fournisseur, la nature de la dépense, le visa fiscal du marché/décompte et la règle d'exigibilité doivent être vérifiés au cas par cas.

Cette matrice est un guide de qualification, pas un calculateur exhaustif. Le champ exact des exceptions, notamment IBNC et opérations avec l'État/collectivités, doit être confirmé dans le CGI consolidé.

### 9.3 Exemple de contrôle : service avec acompte

Hypothèse uniquement pédagogique : fournisseur autorisé à collecter, service taxable au taux 18 %, base totale contractuelle de 1 000 000 FCFA HT. Le client verse un acompte de 300 000 FCFA HT.

Le logiciel doit :
1. rattacher l'acompte au contrat/devis et à la prestation ;
2. qualifier le type de service ;
3. vérifier que la règle d'exigibilité sur acompte s'applique à ce fournisseur ;
4. calculer la portion de base et de TVA correspondante selon les montants effectivement dus/encaissés et la règle validée ;
5. enregistrer l'événement fiscal et la preuve d'encaissement ;
6. empêcher de déclarer une seconde fois la même portion de TVA à l'émission de la facture finale.

Ne pas supposer que tout acompte sur tout type de vente déclenche la TVA de la même manière.

### 9.4 Exemple de contrôle : situation de travaux

Hypothèse : marché BTP ventilé en avance de démarrage, situations intermédiaires et décompte final.

Données distinctes à conserver :
- valeur du marché ;
- montant des travaux réalisés ;
- montant de chaque décompte/situation ;
- avances et acomptes contractuels ;
- retenue de garantie ;
- sommes facturées ;
- sommes effectivement reçues ;
- TVA exigible calculée selon l'article 316 ;
- TVA déjà déclarée ;
- corrections/avoirs.

**Règle métier essentielle :** les situations sont des tranches incrémentales dans le modèle fonctionnel PolyGest, et non des pourcentages cumulatifs facturés à chaque situation. Un contrôle cumulatif doit empêcher de facturer une somme supérieure au contrat, tout en distinguant avancement physique, montant facturé et base taxable/exigible.

### 9.5 Registre minimal des événements fiscaux

Prévoir conceptuellement un registre append-only :
- type d'événement ;
- référence de facture/contrat ;
- date de l'événement ;
- date de réception/encaissement si différente ;
- base taxable concernée ;
- taux et montant de TVA ;
- règle/version juridique ;
- nature et preuve de l'événement ;
- événement d'origine corrigé, le cas échéant ;
- auteur et horodatage.

Une correction doit créer un événement correctif traçable ; elle ne doit pas supprimer l'événement historique.

---

## 10. Retenues à la source et retenues de TVA

Les retenues fiscales ne sont ni des remises commerciales ni des retenues contractuelles (par exemple une retenue de garantie BTP). Leur fait générateur, leur assiette, le débiteur légal, le bénéficiaire, le taux, le reversement et l'imputation doivent être identifiés séparément. L'existence de plusieurs retenues susceptibles de concerner un même marché ne signifie pas qu'elles se cumulent automatiquement : le cumul et l'articulation des textes doivent être validés.

### 10.1 Retenue sur les sommes versées aux prestataires résidents — articles 206 et 207

L'article 206 détermine le champ des sommes soumises à retenue et les débiteurs établis au Burkina Faso. L'article 207, réécrit par l'article 15 de la loi de finances 2026 avec effet au 1er janvier 2026, fixe les taux suivants :
- 5 % du montant HT des sommes versées aux personnes justifiant d'une immatriculation à l'IFU ;
- taux réduit de 1 % pour les travaux immobiliers et les travaux publics ;
- taux réduit de 2 % pour les prestations de travail temporaire ;
- 25 % du montant des sommes versées aux personnes non salariées ne justifiant pas d'une immatriculation à l'IFU.

Le taux de 2 % vise les prestations de travail temporaire, et non indistinctement toutes les opérations commerciales réalisées par une entreprise de travail temporaire. Le taux réduit doit être rattaché à la nature exacte de la prestation et à la condition d'immatriculation IFU prévue pour les taux de faveur.

**Contrôles PolyGest :** vérifier le statut du débiteur, le statut fiscal du bénéficiaire, l'IFU, la nature réelle de la prestation, la base HT, l'attestation éventuelle et la version de l'article 207 applicable à la date du paiement. Ne pas appliquer ces taux à chaque facture de façon automatique sans vérifier le champ de l'article 206.

### 10.2 Retenue libératoire applicable aux contribuables RND — articles 220 à 222

L'article 220 prévoit une retenue à la source libératoire sur les sommes perçues par les contribuables relevant du RND à l'occasion d'opérations de toute nature, quel qu'en soit le montant. L'article 221, dans sa rédaction issue de la loi de finances 2026, prévoit notamment :
- 2 % pour les vacations d'enseignement et les prestations manuelles réalisées par des personnes physiques non salariées ;
- 5 % pour les entités publiques et parapubliques ne réalisant pas habituellement d'activités lucratives, ainsi que pour les autres personnes morales ne réalisant pas habituellement d'activités lucratives, sous réserve de l'exception prévue pour certaines recettes de services publics justifiées par une attestation DGI ;
- 10 % pour les personnes physiques salariées des secteurs public et privé et pour les personnes physiques non salariées accomplissant occasionnellement une prestation intellectuelle qui ne peut être considérée comme une activité de professionnel indépendant, y compris certaines vacations médicales.

L'article 222 encadre les personnes tenues d'opérer la retenue et ses modalités de reversement. Les taux et la qualité du bénéficiaire doivent être lus avec la catégorie exacte du contribuable RND ; un libellé « RND » seul ne suffit pas pour calculer la retenue.

### 10.3 Retenue à la source sur les commandes publiques — article 226-1

L'article 226-1 prévoit une retenue sur les sommes versées à des personnes physiques ou morales résidentes au Burkina Faso en rémunération de commandes publiques, quel qu'en soit l'objet. La version consultée du CGI, mise à jour par les lois de finances antérieures, prévoit notamment :
- une exception pour les contribuables relevant de la DGE et pour ceux qui disposent d'une exonération totale des impôts sur les bénéfices, sous réserve de produire l'attestation exigée ;
- un taux de 5 % du montant HT pour les entreprises relevant du régime du réel et de la CME ;
- un taux réduit de 1 % pour les fournitures de biens, les travaux immobiliers et les travaux publics ;
- un taux réduit de 0,2 % pour les livraisons d'hydrocarbures et les recharges téléphoniques ;
- pour les entités relevant du RND, application de la retenue libératoire visée par les articles 220 et 221.

**Réserve P0 :** la rédaction consolidée de l'article 226-1 doit être confirmée dans le CGI 2026 et rapprochée de toute modification ultérieure. En particulier, PolyGest ne doit pas appliquer simultanément la retenue de l'article 207 et celle de l'article 226-1 sans règle de priorité/cumul validée par un fiscaliste. Les marchés BTP et commandes publiques doivent être des scénarios dédiés.

### 10.4 Retenue de 30 % sur la TVA — article 334, paragraphe 4, LFI 2026

La loi de finances initiale 2026, article 23, prévoit une retenue de 30 % sur le montant de TVA dû dans des situations distinctes :
- entreprises exportatrices de biens taxables en régime intérieur éligibles au remboursement de crédit de TVA, telles que définies à l'article 328 ;
- entreprises relevant de la DGE, sur leurs achats de biens et services ;
- organismes payeurs, sur le montant de TVA dû à l'occasion de tout paiement au profit des titulaires de commandes publiques résidents.

Le texte prévoit une déclaration réglementaire identifiant notamment le fournisseur, l'IFU, la facture, les dates et montants des paiements et la retenue opérée. Une attestation individuelle annotée des références de quittance est remise au fournisseur pour faire valoir la retenue sur ses déclarations de TVA.

Exemple purement arithmétique : si la TVA due sur une opération est de 180 000 FCFA et si la retenue de 30 % est légalement applicable, la retenue représente 54 000 FCFA. Cela ne signifie pas que tous les clients doivent opérer cette retenue : la qualité du payeur, du fournisseur, la nature de l'achat et la situation de l'opération doivent être vérifiées.

### 10.5 Architecture des retenues

Ne pas créer un champ unique `withholding_rate` sur la facture. Distinguer au minimum :
- retenue sur prestations résidentes (articles 206-207) ;
- retenue libératoire RND (articles 220-222) ;
- retenue sur commandes publiques (articles 226-1 et 226-2) ;
- retenue de TVA (article 334) ;
- acomptes imputables sur impôt sur bénéfices ;
- retenues contractuelles non fiscales, notamment la retenue de garantie.

Chaque événement doit stocker le débiteur légal, le bénéficiaire, le texte, l'assiette, le taux, la date de paiement, le montant retenu, le délai de reversement, le justificatif/attestation et les conditions d'imputation. Les règles de cumul, d'ordre d'application et de restitution ne sont pas à déduire : elles exigent validation professionnelle.

---

## 11. Paiement scriptural et seuil de 1 000 000 FCFA TTC

L'article 568, réécrit par la loi de finances 2025 avec effet au 1er janvier 2025, prévoit que les achats de biens, services et immobilisations d'un montant **au moins égal à 1 000 000 FCFA TTC** doivent être réglés par des moyens de paiement scripturaux. Le texte définit ces moyens comme tout moyen de paiement autre que les espèces.

La rédaction 2025 prévoit les conséquences suivantes en cas d'infraction :
- pour l'acheteur : non-déductibilité de l'achat au titre de l'impôt sur les bénéfices, ou des amortissements pour une immobilisation, et non-déductibilité de la TVA acquittée ;
- pour le fournisseur : amende égale à 25 % du montant encaissé ;
- pour l'acheteur relevant du RND ou de la CME : amende égale à 25 % du montant payé.

**Point de lecture juridique :** le seuil de 1 000 000 FCFA TTC a été introduit par la loi de finances 2024 ; la rédaction applicable depuis le 1er janvier 2025 ajoute/réorganise les sanctions ci-dessus. L'obligation porte sur les achats de biens, services et immobilisations dans la rédaction 2025 consultée. Ne pas restreindre silencieusement la règle aux seuls contribuables du réel sur la base d'une ancienne version.

**Décision PolyGest :**
- contrôler le seuil au niveau de l'achat et de son règlement, pas seulement au niveau de la facture de vente ;
- conserver montant TTC, date, mode de paiement, acheteur, fournisseur et preuve du paiement ;
- faire contrôler le seuil par opération d'achat conformément au texte ; ne pas traiter un fractionnement contractuel ou des paiements partiels comme une dispense automatique ;
- calculer les conséquences fiscales séparément pour l'acheteur et le fournisseur ;
- ne pas affirmer qu'une dépense ou une TVA est déductible lorsque le moyen de paiement ne respecte pas le texte ;
- demander une revue en cas de paiement multi-moyens, de versements fractionnés ou d'opérations liées, car les règles anti-contournement et le périmètre exact doivent être confirmés.

---

## 12. Numérotation, annulation, avoirs et conservation

### 12.1 Numérotation

L'article 562 consulté exige une numérotation dans une série ininterrompue. Le moteur doit :
- attribuer les numéros côté serveur, dans une transaction atomique ;
- séparer les séquences par entité juridique, établissement, type de document et exercice si cette segmentation est légalement permise et validée ;
- empêcher la réutilisation d'un numéro ;
- conserver les numéros réservés/annulés et le motif ;
- empêcher la suppression définitive d'une facture émise ;
- auditer chaque attribution et changement de configuration.

Ne pas choisir arbitrairement le format de séquence tant que le champ exact autorisé est vérifié dans le texte et la pratique DGI.

### 12.2 Cycle de vie documentaire

États applicatifs proposés :
- brouillon ;
- en validation interne ;
- validé commercialement ;
- émis ;
- soumis à certification ;
- certifié (uniquement si preuve vérifiée) ;
- refusé/échec certification ;
- partiellement réglé ;
- réglé ;
- annulé selon procédure ;
- rectifié par avoir/document correctif.

Un document émis doit être immuable. Une rectification produit un document et des écritures/événements correctifs, pas une réécriture silencieuse de l'original.

### 12.3 Conservation de dix ans

L'article 46 de la loi de finances 2025 réécrit l'article 567 du CGI avec effet au 1er janvier 2025. Les redevables doivent conserver pendant dix ans les doubles des factures, notes d'honoraires, bons de commande, bons de livraison et toute autre pièce justificative des éléments contenus dans les déclarations souscrites. Pour les sociétés liquidées, cette obligation incombe au syndic liquidateur. Les documents doivent être présentés à toute réquisition des agents des impôts.

L'article 55 de la même loi modifie l'article 802 :
- défaut de conservation avant l'expiration du délai ou défaut de présentation : amende fiscale de 100 000 FCFA par document manquant ;
- destruction volontaire avant la fin du délai : amende fiscale de 5 000 000 FCFA.

La conservation de dix ans est donc une obligation légale documentée pour les pièces visées ; les modalités précises d'archivage électronique, les extensions à des données techniques et les règles sectorielles complémentaires doivent être vérifiées séparément.

Pour les données électroniques :
- conserver le fichier original ;
- conserver les données structurées exactes du document ;
- conserver les réponses SECeF/SFE, lorsqu'il y en a ;
- conserver la preuve de remise/envoi ;
- conserver une empreinte cryptographique ;
- conserver le contexte réglementaire (règles, paramètres, date) ;
- garantir lisibilité, intégrité, accès contrôlé et restauration.

---

## 13. Modèle conceptuel de données — sans migration

Les objets ci-dessous sont des concepts de conception. Ils ne constituent pas un schéma SQL approuvé.

| Objet conceptuel | Finalité | Règle d'intégrité |
|---|---|---|
| `company_tax_profiles` | Profil fiscal de l'entreprise | Historique daté, preuve et validation |
| `company_tax_regime_periods` | Périodes de régimes successifs | Périodes non ambiguës, pas d'écrasement d'historique |
| `vat_collection_status_periods` | Statut du droit de collecter TVA | Distinguer régime, autorisation et opération |
| `tax_rule_versions` | Référentiel de règles et taux | Date d'effet et source obligatoire |
| `tax_operation_codes` | Qualification des catégories d'opérations | Codes contrôlés, pas de texte libre comme règle |
| `invoice_tax_assessments` | Résultat de qualification d'une facture | Snapshot de règles utilisé à l'émission |
| `tax_events` | Fait générateur/exigibilité/acomptes | Append-only, événements correctifs |
| `tax_withholding_events` | Retenues fiscales | Distinguer débiteur, créancier et nature de retenue |
| `tax_evidence_documents` | Pièces justificatives | Stockage privé, référence/version/hachage |
| `fec_submissions` | Échange avec système homologué | Aucune certification sans retour vérifiable |
| `fec_responses` | Réponses du système certifié | Conservation immuable de la réponse reçue |
| `tax_review_decisions` | Arbitrages humains | Auteur, rôle, motif, date, pièces et règle concernée |

### 13.1 Contraintes transversales

- Toutes les données métier appartiennent à une entreprise et sont isolées par `company_id`.
- Les décisions fiscales exigent des permissions côté serveur, pas seulement des contrôles UI.
- Toute pièce fiscale doit être stockée dans un espace privé.
- Les événements et documents émis sont immuables ; correction par événement ou document lié.
- Les règles sont lues par date d'effet de l'opération, pas par la date courante uniquement.
- Les montants utilisent des décimaux exacts.
- Les conversions monétaires et arrondis font l'objet de règles explicites et testées.
- Un export ou document doit indiquer le statut de certification réel.
- Les actions de validation fiscale sont journalisées et ne peuvent être effectuées par un rôle non autorisé.

---

## 14. Algorithme conceptuel de décision

Pour une facture donnée, le moteur doit appliquer les étapes suivantes dans l'ordre :

1. Identifier l'entreprise émettrice, son établissement et la date d'opération.
2. Charger le profil fiscal et la période de régime applicable à cette date.
3. Vérifier la preuve du régime et le rattachement administratif.
4. Charger le statut de collecte TVA applicable à cette date.
5. Identifier la nature de l'opération et le lieu d'imposition.
6. Déterminer si l'opération est dans le champ, exonérée ou hors champ.
7. Déterminer le taux admissible et vérifier ses conditions (activité, agrément, origine, justificatif).
8. Déterminer le fait générateur et l'exigibilité en fonction de la nature de l'opération et des acomptes.
9. Examiner les retenues applicables selon le fournisseur, le client/payeur et la nature du paiement.
10. Déterminer l'obligation de facture normalisée et les éventuelles dispenses.
11. Déterminer l'obligation FEC selon le fournisseur, le rattachement DGE/DME, la nature de l'opération et les exceptions FEC.
12. Vérifier la numérotation et les mentions.
13. Produire une décision explicable, liée aux sources et preuves utilisées.
14. Conserver un snapshot du résultat, des règles et des justificatifs.

### 14.1 Résultats possibles

États internes proposés (non réglementaires) :
- `verified` : profil et règles vérifiés ;
- `pending_evidence` : document justificatif manquant ;
- `requires_tax_review` : qualification ou exception à valider ;
- `not_applicable` : obligation non applicable selon règle vérifiée ;
- `blocked` : action interdite faute de preuve ou en raison d'une règle ;
- `ready_for_fec_submission` : données préparées, sans prétendre à la certification ;
- `certified` : réponse positive reçue d'un système effectivement certifié ;
- `certification_failed` : rejet/échec vérifiable.

La réponse du moteur doit exposer : règle utilisée, article, date d'effet, entrée de données, calcul, justificatif, avertissement et raison du blocage. Un utilisateur doit pouvoir comprendre pourquoi une TVA ou une retenue a été calculée.

---

## 15. Scénarios de tests métier à faire valider

Aucun taux ou résultat fiscal n'est réputé valide tant que les scénarios ci-dessous n'ont pas été approuvés par un professionnel.

| ID | Situation à tester | Résultat/contrôle attendu |
|---|---|---|
| REG-01 | RNI avec preuve valide et opération taxable | TVA autorisée uniquement si l'opération est taxable et fournisseur habilité |
| REG-02 | RSI sans option acceptée | Interdiction de collecter TVA |
| REG-03 | RSI ayant déposé une demande d'option mais sans décision | TVA toujours bloquée |
| REG-04 | RSI avec décision DGI acceptée et date d'effet confirmée | Activation à partir de la date d'effet uniquement |
| REG-05 | CME personne physique sous 5m | Contrôle d'éligibilité au forfait, pas d'activation automatique |
| REG-06 | CME personne physique entre 5m et 15m | Contrôle du statut déclaratif |
| REG-07 | Personne morale sous 15m | Vérifier CME déclarative et exclusions |
| REG-08 | Activité libérale ou CSE potentielle | Refus d'affectation automatique à CME |
| REG-09 | Dépassement du seuil RSI | Alerte et suivi du délai de notification ; pas de réécriture rétroactive |
| REG-10 | Création en cours d'exercice | Calcul de prorata seulement selon la formule validée |
| TVA-01 | Opération au taux normal | Taux appliqué selon version à date de l'opération |
| TVA-02 | Opération demandant taux réduit sans agrément/preuve | Blocage ou revue |
| TVA-03 | Exonération annoncée dans LFR 2026 sans texte final archivé | Revue requise, pas d'exonération automatique |
| TVA-04 | Fournisseur non autorisé avec taux 0 saisi | Rejeter la ligne TVA et distinguer absence de collecte |
| TVA-05 | Opération hors champ | Ne pas classer comme exonération |
| TVA-06 | Modification de taux à date d'effet future | Ancienne facture conserve l'ancien taux |
| FEC-01 | Fournisseur DGE avec obligation confirmée | Exiger intégration SECeF et preuve de certification avant état « certifié » |
| FEC-02 | Fournisseur DME, date d'entrée en vigueur non confirmée | Revue requise ; ne pas extrapoler calendrier |
| FEC-03 | Client RND | Contrôler réception FEC selon texte et exceptions |
| FEC-04 | Exception facture normalisée mais pas exception FEC | Ne pas étendre l'exception par analogie |
| FEC-05 | Génération PDF sans intégration homologuée | Document marqué non certifié |
| EVT-01 | Vente de biens avec facture avant livraison | Vérifier règle d'exigibilité anticipée de l'article 316 |
| EVT-02 | Service avec acompte | Calculer la part exigible si règle applicable |
| EVT-03 | Travaux immobiliers avec avance et situations | Tracer contrat, exécution, situation, avance, encaissement et TVA |
| EVT-04 | Service relevant du cas particulier IBNC | Appliquer la règle spéciale validée |
| WHT-01 | Article 207, bénéficiaire IFU | Vérifier assiette et catégorie avant taux |
| WHT-02 | Travaux publics/travaux immobiliers | Vérifier catégorie et base avant taux réduit |
| WHT-03 | Article 221, vacation | Vérifier statut du bénéficiaire et nature du paiement |
| WHT-04 | Retenue TVA de 30 % | Vérifier qualité du payeur/fournisseur et commande éligible |
| PAY-01 | Transaction TTC dépassant 1m payée en espèces | Déclencher alerte/contrôle selon articles 568 et sanctions en vigueur |
| DOC-01 | Attribution simultanée de factures | Numéros uniques et continus selon séquence approuvée |
| DOC-02 | Facture émise puis corrigée | Original conservé, correction liée, audit complet |
| DOC-03 | Document fiscal de 2025 relu en 2026 | Version de règle 2025 conservée |
| ARCH-01 | Export du dossier fiscal | Pièces, document original, règles et preuves réunis |

---

## 16. Questions à trancher avec un professionnel fiscal burkinabè

1. Quel est le texte consolidé et signé du CGI applicable après LFI 2026 et LFR 2026 ?
2. Quelle est la date de promulgation et de publication de la LFR 2026 au Journal officiel ? Les dispositions s'appliquent-elles à la date de publication ou à une date spécifique ?
3. Quelles exonérations de la LFR 2026 sont immédiatement applicables, et quels biens/opérations/justificatifs sont précisément visés ?
4. Quelle est la rédaction actuelle des articles 562 à 568 après les lois de finances 2024, 2025 et 2026 ?
5. La nouvelle exception fournisseur d'accès Internet fibre optique figure-t-elle bien dans l'article 566 actuel, et quel est son champ exact ?
6. Quels contribuables et opérations sont effectivement soumis à FEC à la date du 3 novembre 2026 ? Quelles sont les dates d'effet opposables, distinctes des dates de disponibilité du matériel ?
7. Comment articuler les exceptions de facture normalisée avec les exceptions propres à la FEC ?
8. Quels sont les cas exacts de TVA réduite à 10 % et leurs justificatifs ?
9. Quelle méthode d'arrondi et de ventilation de TVA est exigée sur les factures normalisées/FEC ?
10. Quelles retenues à la source s'appliquent à chacun des profils client/fournisseur et comment traiter leur imputation ?
11. Quelles sont les règles d'avoir, de remplacement, d'annulation et de correction d'une FEC déjà certifiée ?
12. Comment appliquer l'article 568 au paiement fractionné, aux marchés publics, aux achats récurrents et aux moyens de paiement électroniques ?
13. Quelles durées de conservation s'appliquent aux documents papier, FEC, fichiers structurés, pièces de paiement et journaux d'audit ?

---

## 17. Feuille de validation avant développement

| Priorité | Action | Preuve attendue | Bloque quoi ? |
|---|---|---|---|
| **P0** | Obtenir LFR 2026 promulguée et Journal officiel | PDF officiel, date, numéro, articles | Toute règle affectée par LFR |
| **P0** | Obtenir et archiver CGI 2026 consolidé | PDF DGI officiel daté et hashé | Validation de tout le moteur |
| **P0** | Faire confirmer articles 562 à 568 | Note de fiscaliste avec références | Factures et archivage |
| **P0** | Confirmer le droit de collecte TVA par régime | Matrice signée/validée et justificatifs attendus | Calcul TVA |
| **P0** | Confirmer calendrier FEC et catégorie entreprise | Communiqués/arrêtés officiels + preuve de rattachement | Certification et émission |
| **P0** | Faire valider les articles 207, 221, 334 | Scénarios réels documentés | Retenues |
| **P1** | Définir arrondis et calculs | Cas de calcul approuvés | Moteur de montants |
| **P1** | Définir avoirs/annulations | Procédure validée | Cycle de vie documentaire |
| **P1** | Définir la conservation et les archives | Politique et durée par type de pièce | Archivage |
| **P1** | Définir les contrôles de paiement scriptural | Cas et exceptions | Achats/paiements |
| **P2** | Concevoir connecteur SECeF/SFE | Spécifications et homologation/accord fournisseur | Intégration FEC |

### Critère d'acceptation de la matrice

La matrice n'est considérée comme validée que lorsque :
- toutes les lignes P0 disposent d'une source légale actuelle ;
- le texte LFR 2026 a été rapproché du CGI 2026 ;
- les conditions et exceptions sont explicites ;
- les cas de test sont signés/confirmés par un professionnel ;
- chaque règle a une période d'effet ;
- aucun cas non résolu ne déclenche une décision automatique.

---

## 18. Sources institutionnelles à archiver

Les liens suivants constituent le dossier de départ. Les fichiers téléchargés doivent être conservés dans leur forme d'origine et leur empreinte vérifiée lors de la revue juridique.

### Sources DGI
- [DGI — Lois et Code général des impôts, dont édition 2026](https://dgi.bf/lois/)
- [DGI — Code général des impôts 2026 (accès officiel référencé par la DGI)](https://dgi.bf/code-general/) — le fichier exact doit être téléchargé et archivé dans le dépôt ; le référencement sur le site ne suffit pas à établir une copie locale vérifiée.
- [DGI — Régimes d'imposition (définition RNI, RSI, CME, CSE et RND)](https://dgi.bf/regime_imposition/)
- [DGI — Régimes d'imposition](https://dgi.bf/regime_imposition/)
- [DGI — FAQ](https://dgi.bf/faq/)
- [DGI — Facture électronique certifiée](https://dgi.bf/facture-electronique-certifie/)
- [DGI — Communiqués](https://dgi.bf/communiques/)
- [DGI — Instruction administrative sur la facture normalisée](https://dgi.bf/wp-content/uploads/2023/10/INSTRUCTION-ADMINISTRATIVE-PORTANT-SUR-LA-FACTURE-NORMALISEE.pdf)

### Textes législatifs et réglementaires
- [Journal officiel spécial n°01 — Loi de finances 2026](https://dgi.bf/wp-content/uploads/2026/01/JOURNAL-OFFICIEL-N%C2%B001-SPECIAL-LOI-DE-FINANCES-2026.pdf)
- [Loi de finances 2025 — copie diffusée par la Direction générale des douanes](https://douanes.bf/sydoniabf/files/Loi_Finances_2025.pdf)
- [Arrêté n°2025-0049 — conditions et modalités d'émission de la FEC](https://dgi.bf/wp-content/uploads/2026/01/arrete-portant-Conditions-et-Modalites-demission-de-la-FEC.pdf)
- [Arrêté sur les documents tenant lieu de FEC](https://dgi.bf/wp-content/uploads/2023/10/ARRETE-SUR-LES-DOCUMENTS-TENANT-LIEU-DE-LA-FEC.pdf)
- [Loi de finances 2024 — texte DGI, notamment modification de l'article 568](https://dgi.bf/wp-content/uploads/2023/10/LOI-DE-FINANCES-2024.pdf)
- [Loi n°042-2024/ALT portant loi de finances 2025 — copie institutionnelle diffusée par la Direction générale des douanes](https://douanes.bf/sydoniabf/files/Loi_Finances_2025.pdf) — articles 30-31, 44-47 et 53-55 ; confronter au fichier publié dans la rubrique Lois de la DGI.

### LFR 2026 — étapes institutionnelles
- [Assemblée législative du Peuple — adoption de la LFR 2026 le 23 septembre 2026](https://www.assembleenationale.bf/945)
- [Ministère de l'Économie et des Finances — mesures fiscales annoncées le 25 septembre 2026](https://www.finances.gov.bf/forum/detail-actualites?cHash=7cbee7c01302c96e3fc4051255bdae04&tx_news_pi1%5Baction%5D=detail&tx_news_pi1%5Bcontroller%5D=News&tx_news_pi1%5Bnews%5D=2995)

### Sources anciennes de référence à ne pas utiliser seules
- [CGI 2023 — version historique consultée pour les articles 562 à 568](https://dgi.bf/wp-content/uploads/2023/08/Code-general-des-impots-a-jour-avec-la-LF-2023.pdf)

---

## 19. Décision finale pour l'équipe PolyGest

À cette étape :
- les régimes, statuts TVA, traitements d'opération, obligations documentaires et retenues sont des dimensions séparées ;
- la FEC est traitée comme un résultat d'un système réglementé/homologué, et non comme un simple PDF ;
- les acomptes et situations de travaux exigent un registre d'événements fiscaux ;
- les versions fiscales sont conservées par date d'effet ;
- les retenues fiscales sont séparées des retenues contractuelles et des remises ;
- la LFR 2026 et le CGI 2026 consolidé sont des pièces P0 manquantes au dossier de validation.

**Aucune migration SQL, aucun calcul fiscal présenté comme conforme et aucune émission FEC ne doivent être développés avant fermeture des validations P0.** La prochaine étape après approbation documentaire sera une revue professionnelle des règles, puis une conception détaillée du domaine fiscal et des scénarios de tests, toujours sans migration tant que la spécification n'est pas validée.


---

## 20. Journal de revue documentaire — 3 novembre 2026

Cette édition 0.2 intègre une première confrontation de la matrice avec les pages et textes officiels retrouvés le 3 novembre 2026. Cette revue documentaire améliore la précision de la recherche ; elle ne constitue pas la validation par un fiscaliste.

### 20.1 Sources officielles directement retrouvées

| Source | Éléments établis | Limite restante |
|---|---|---|
| DGI — Régimes d'imposition | Cinq régimes, seuils RNI/RSI, option RSI vers RNI, CME forfaitaire/déclarative et exemples RND | Une page pratique DGI ne remplace pas la lecture intégrale du CGI 2026 |
| Journal officiel spécial n°01 du 2 janvier 2026 | Articles 207, 221, 334 §4, 529 et 548 de la LFI 2026 | Rapprocher le CGI consolidé 2026 |
| Arrêté n°2025-0049 du 5 février 2025 | Cadre d'émission FEC, systèmes physiques et SFE | Spécifications techniques et procédure d'homologation à archiver |
| Arrêté sur les documents tenant lieu de FEC | Catégories de pièces substitutives et mentions requises | Vérifier la validité et l'actualité de chaque cas concret |
| Loi de finances 2024 | Relèvement du seuil de paiement scriptural à 1 000 000 FCFA TTC | La LFI 2025 modifie ensuite l'article 568 et ses sanctions |
| Loi de finances 2025 | Nouvelle rédaction de l'article 568 et sanctions annoncées dans le texte consulté | Archiver et contrôler le texte promulgué complet, pas seulement le rapport parlementaire |
| Assemblée législative du Peuple — 23 septembre 2026 | Adoption en plénière du projet de LFR 2026 | Promulgation et publication au Journal officiel non établies dans le dossier |
| Ministère de l'Économie et des Finances — 25 septembre 2026 | Mesures fiscales annoncées pour la LFR 2026 | Le communiqué ne remplace pas les articles définitifs |

### 20.2 Corrections de fond apportées

1. RSI : ajout de la catégorie des contribuables exclus de la CME qui ne remplissent pas les conditions du RNI, prévue à l'article 529 nouveau.
2. RND : précision de sa définition DGI, de ses catégories illustratives et de la retenue libératoire visée à l'article 220.
3. FEC : ajout des documents tenant lieu de FEC, avec distinction explicite des dispenses de facture normalisée et du statut de FEC certifiée.
4. Retenues : séparation des articles 206-207, 220-222, 226-1/226-2 et 334.
5. Paiement scriptural : distinction entre le relèvement du seuil par la LFI 2024 et les sanctions issues de la rédaction 2025 de l'article 568.
6. LFR 2026 : formulation ramenée à l'adoption parlementaire du projet et à l'annonce ministérielle ; aucune date d'effet fiscale n'est activée sans texte promulgué consulté.

### 20.3 Points de vigilance identifiés pour la prochaine revue

- Vérifier dans le CGI 2026 les mentions exactes de l'article 562, les listes complètes de l'article 566 et les sanctions applicables aux factures normalisées et FEC.
- Obtenir le texte promulgué de la LFR 2026 et le Journal officiel.
- Archiver le CGI 2026 indiqué sur le site DGI, puis contrôler les articles 206-207, 220-222, 226-1/226-2, 315-316, 334, 529, 548 et 562-568.
- Vérifier la rédaction consolidée et la portée de l'article 226-1, notamment les exceptions DGE et exonération totale, les taux de commande publique et l'articulation avec l'article 207.
- Vérifier les règles de cumul ou de priorité entre retenue sur prestations, retenue sur commande publique et retenue de TVA.
- Vérifier les sanctions de l'article 568 et les modalités de calcul par opération, y compris paiements partiels et fractionnés.
- Télécharger les communiqués DGI du 28 août et du 29 octobre 2026 relatifs aux SECeF et archiver leurs annexes et délais exacts.
- Vérifier l'articulation entre article 566 §2, arrêté FEC et documents tenant lieu de FEC.



### 20.5 Précisions complémentaires issues de la loi de finances 2025 et du CGI consulté

- **Article 564 :** à compter du 1er janvier 2025, les contribuables DGE et DME doivent délivrer exclusivement une FEC ou un document tenant lieu de FEC, sous réserve des dispenses prévues à l'article 566 et des textes d'application. La date législative et le calendrier opérationnel de déploiement doivent être gérés comme deux données distinctes.
- **Article 566 :** la loi distingue expressément les dispenses de facture normalisée (paragraphe 1) et les dispenses de FEC pour certains contribuables DGE (paragraphe 2).
- **Articles 798-1 et 798-2 :** sanctions respectives relatives aux factures normalisées non conformes et au défaut de FEC ou à l'absence d'homologation d'un SFE.
- **Article 567 :** conservation de dix ans, confirmé par sa nouvelle rédaction issue de la loi de finances 2025.
- **Article 802 :** amende de 100 000 FCFA par document manquant et amende de 5 000 000 FCFA en cas de destruction volontaire avant le terme.
- **Article 316, paragraphe 6 :** cas particulier de fourniture/livraison à l'État, aux collectivités et à leurs démembrements non industriels ou commerciaux, avec possibilité de différé de paiement jusqu'au règlement du Trésor et retenue au taux indiqué lors du visa fiscal.

### 20.6 Règle de non-activation

Toute règle dont le texte consolidé, l'entrée en vigueur, le champ, l'assiette, l'exception ou l'articulation n'est pas vérifié doit rester à l'état `requires_tax_review`. Aucune valeur par défaut ne doit transformer une lacune documentaire en décision fiscale.
