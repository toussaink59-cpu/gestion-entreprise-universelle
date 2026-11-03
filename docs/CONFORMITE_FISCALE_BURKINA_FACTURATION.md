# Référentiel de conformité fiscale — Facturation au Burkina Faso

**Produit :** PolyGest  
**Juridiction de départ :** Burkina Faso  
**Date de recherche :** 3 novembre 2026  
**Statut :** référentiel de conception — à faire valider par un conseil fiscal et à réactualiser avant toute mise en production  
**Périmètre :** devis, factures normalisées, TVA, facturation électronique certifiée (FEC), acomptes, situations, conservation et événements fiscaux

> Ce document traduit les textes et informations institutionnelles consultés en exigences produit. Il ne constitue ni un avis fiscal, ni une attestation de conformité. Lorsqu'une règle dépend d'une situation particulière, d'une décision individuelle ou d'une instruction technique non accessible, PolyGest doit demander une validation et ne doit pas inventer le traitement.

## 1. Décisions structurantes pour l'architecture

PolyGest ne doit pas réduire la fiscalité burkinabè à un interrupteur « TVA activée / TVA désactivée ». Il faut séparer cinq dimensions qui ne sont pas interchangeables :

1. **Régime fiscal** de l'entreprise : RNI, RSI, CME, CSE, RND ou autre régime dûment documenté.
2. **Droit effectif de collecter la TVA** à la date de l'opération : autorisation générale, option acceptée ou situation spéciale documentée.
3. **Obligation de facture normalisée** : elle concerne de nombreux opérateurs quel que soit leur régime fiscal, sous réserve des exceptions légales.
4. **Obligation de facture électronique certifiée (FEC)** : elle dépend notamment du rattachement à la DGE/DME et des textes d'application ; elle ne se confond pas avec le régime de TVA.
5. **Règles applicables à l'opération** : nature de la vente/prestation, taux ou exonération, fait générateur, exigibilité, avances, retenues et date de l'événement taxable.

Ces dimensions doivent être enregistrées séparément, avec leurs dates d'effet et leurs justificatifs. Le chiffre d'affaires peut déclencher une alerte de seuil ; il ne doit pas changer silencieusement le régime ou le droit TVA d'une entreprise.

**Conséquence majeure :** un PDF standard généré par PolyGest n'est pas une FEC. PolyGest ne doit pas annoncer qu'il émet des FEC tant que le système de facturation concerné n'a pas reçu l'homologation ou l'attestation requise et que l'intégration technique n'a pas été validée par la DGI.

## 2. Régimes fiscaux et traitement du chiffre d'affaires

### 2.1 Régimes recensés par la DGI

La page de la DGI présente cinq grandes catégories : régime du réel normal d'imposition (RNI), régime du réel simplifié d'imposition (RSI), contribution des micro-entreprises (CME), contribution spéciale d'élevage (CSE) et régime du non-déterminé (RND).

Pour l'activité commerciale/prestations de services de droit commun, les seuils publiés par la DGI sont notamment :

| Régime | Situation générale décrite par la DGI | Effet TVA à retenir |
|---|---|---|
| RNI | Chiffre d'affaires annuel HT égal ou supérieur à 50 000 000 FCFA | Régime habilité à facturer la TVA |
| RSI | Chiffre d'affaires annuel HT égal ou supérieur à 15 000 000 FCFA et inférieur à 50 000 000 FCFA | Ne facture pas la TVA, sauf option pour le RNI acceptée par la DGI |
| CME | Activité indépendante sous le seuil annuel HT de 15 000 000 FCFA, sous réserve des exclusions | Ne facture pas la TVA |
| CSE | Régime spécial lié à certaines activités d'élevage et assimilées | Ne pas déduire le régime ni le traitement TVA du seul CA ; faire vérifier |
| RND | Catégorie particulière recensée par la DGI pour des entités/personnes spécifiques | Ne pas assimiler à un régime commercial ordinaire ; vérifier l'obligation et les documents attendus |

Les seuils sont annuels et hors taxes. La DGI indique un prorata temporis lorsque l'activité est créée en cours d'année. Le passage du RNI au RSI est conditionné à trois années consécutives sous le seuil applicable ; le dépassement d'un seuil n'est donc pas un changement immédiat et automatique de régime dans l'application.

### 2.2 Sous-régimes CME

La CME doit être traitée avec plus de finesse qu'une catégorie unique :

- personne physique : CME forfaitaire sous 5 000 000 FCFA de chiffre d'affaires annuel ;
- personne physique : CME déclarative à partir de 5 000 000 FCFA et sous 15 000 000 FCFA ;
- personne morale : CME déclarative sous 15 000 000 FCFA ;
- les activités ou personnes exclues par les textes, notamment certaines professions libérales et activités relevant du CSE, ne doivent pas être affectées automatiquement à la CME ;
- la DGI indique qu'un dépassement de 15 000 000 FCFA en cours d'année rend la CME caduque et doit être signalé à l'administration dans le délai qu'elle précise (30 jours).

La DGI décrit également la possibilité, pour certaines entreprises au RSI ou à la CME, d'opter pour le RNI selon une procédure et des conditions précises. L'option RSI vers RNI doit être acceptée par la DGI ; elle implique notamment une régularité fiscale, une comptabilité adaptée et un engagement déclaratif. L'application doit stocker la décision et sa date d'effet, et non seulement la demande d'option.

### 2.3 Règle de paramétrage PolyGest

À l'ouverture d'un dossier entreprise, demander au responsable :

- le régime indiqué par son document fiscal ou son service des impôts ;
- le sous-régime lorsque pertinent ;
- l'IFU et le service des impôts de rattachement ;
- le rattachement administratif (DGE, DME ou autre direction/service) ;
- le statut TVA confirmé et, le cas échéant, la référence de l'option ou de la décision ;
- les dates d'effet ;
- le justificatif et la date de dernière vérification.

Si le justificatif manque, le profil est « à vérifier » et la facturation TVA est bloquée par défaut. L'application peut afficher des avertissements lorsque le CA déclaré approche ou dépasse un seuil, mais elle doit demander une mise à jour du profil fiscal. Aucun changement de régime n'est déclenché sur la seule base d'un total de factures.

## 3. Obligation de facture normalisée

### 3.1 Principe général

La DGI rappelle que les industriels, commerçants, prestataires de services, importateurs, producteurs et entrepreneurs de travaux immobiliers sont soumis à l'obligation de délivrer une facture normalisée, quel que soit leur régime d'imposition, sous réserve des dispenses prévues par les textes.

Il faut donc distinguer :
- l'absence de droit de facturer la TVA ;
- l'obligation d'émettre une facture ;
- l'obligation d'utiliser un format normalisé ;
- l'obligation spécifique d'émettre une FEC.

Une entreprise non assujettie ou non autorisée à collecter la TVA n'est pas, pour cette seule raison, dispensée de facturation.

### 3.2 Données attendues sur la facture

Le socle de l'article 562 du CGI et de l'instruction administrative de la DGI relative à la facture normalisée conduit à prévoir au minimum les informations suivantes, selon le type de fournisseur et de client :

**Émetteur**
- nom et prénoms, ou forme juridique et raison sociale ;
- adresse géographique, cadastrale et postale ;
- téléphone ;
- numéro IFU ;
- numéro RCCM ou registre professionnel/artisanal applicable ;
- références du ou des comptes bancaires à afficher selon les textes ;
- régime d'imposition ;
- service des impôts de rattachement.

**Client**
- nom et prénoms, ou forme juridique et raison sociale ;
- adresse géographique et postale, et coordonnées requises ;
- RCCM ou registre professionnel pour les commerçants, lorsque requis ;
- IFU pour les personnes morales et les commerçants, selon les dispositions applicables.

**Transaction**
- numéro de facture appartenant à une série ininterrompue ;
- date d'établissement ;
- objet précis et description des biens, services ou travaux ;
- prix, quantités et ventilation fiscale appropriée ;
- montant total dû.

Pour un fournisseur autorisé à facturer la TVA, la facture doit distinguer la base hors taxe, le taux et le montant de TVA, puis le total TTC ; le cas échéant, elle doit faire apparaître la mention d'exonération applicable. Pour un fournisseur qui n'est pas autorisé à facturer la TVA, le document doit présenter le montant dû par le client sans afficher une fausse TVA à 0 %.

Les anciennes instructions sur les stickers, formats papier et dispositifs de sécurisation ont été complétées par les textes plus récents sur la FEC. PolyGest ne doit donc pas coder un ancien modèle de sticker comme règle universelle actuelle. Le format papier/normalisé applicable à une entreprise non encore soumise à la FEC doit être revalidé auprès de la DGI selon sa situation exacte.

### 3.3 Exceptions

L'article 566 du CGI distingue deux listes différentes :

**Dispenses d'usage de facture normalisée (article 566, paragraphe 1)** :
- État, collectivités territoriales et établissements publics sans activité industrielle ou commerciale ;
- entreprises sans établissement stable au Burkina Faso ;
- entreprises de vente à rayons multiples pour les ventes au détail donnant lieu à tickets/tickets de caisse ;
- pharmacies ;
- sociétés de navigation aérienne ;
- entreprises de transport urbain en commun pour les transports de personnes donnant lieu à tickets ;
- stations-services pour les ventes de carburant ;
- banques, établissements financiers et systèmes financiers décentralisés ;
- sociétés d'assurance ;
- concessionnaires de service public d'eau et d'électricité ;
- entreprises de téléphonie titulaires d'une licence ;
- opérateurs de télévision privée pour les seuls abonnements/réabonnements de particuliers ;
- fournisseurs d'accès internet pour les seuls abonnements/réabonnements de particuliers ;
- CCVA, SONABHY, Poste Burkina Faso et LONAB, dans les conditions du texte.

**Dispenses de FEC (article 566, paragraphe 2)** :
- pour les contribuables relevant de la DGE : État, collectivités et établissements publics sans activité industrielle ou commerciale ; entreprises sans établissement stable au Burkina Faso ; sociétés de navigation aérienne ; entreprises de transport urbain en commun pour les transports de personnes donnant lieu à tickets.

La liste des dispenses de facture normalisée ne doit pas être automatiquement appliquée à la FEC : le paragraphe 2 est une liste distincte, formulée pour les contribuables de la DGE. L'arrêté FEC prévoit par ailleurs des documents tenant lieu de FEC pour des situations déterminées ; ces cas doivent être traités séparément après examen du texte applicable.

**Règle produit :** aucune dispense ne doit être déduite à partir d'un champ libre. Une exception doit être choisie dans une liste contrôlée, rattachée à son fondement légal, à l'opération et à la période, justifiée par une pièce/référence et validée par un administrateur habilité.

## 4. Facture électronique certifiée (FEC) et homologation

### 4.1 Cadre observé

L'article 564 du CGI modifié par la loi de finances 2025 prévoit un dispositif spécifique de FEC pour les contribuables relevant de la DGE et des DME. L'arrêté n°2025-0049/MEF/SG/DGI du 5 février 2025 définit la FEC, les SECeF physiques (UF/MCF), le système de facturation d'entreprise (SFE) et l'homologation.

L'arrêté indique que toute entreprise relevant de la DGE ou d'une DME qui livre un bien ou fournit un service doit délivrer une FEC lors de chaque transaction, dans les conditions réglementaires. L'arrêté prévoit également que les acteurs de la chaîne d'exécution des dépenses publiques et les personnes relevant du RND n'acceptent que des FEC provenant des fournisseurs locaux, sous réserve des exemptions prévues. Cette règle crée une exigence côté client : un fournisseur peut avoir besoin de vérifier que son client public ou RND exige un document certifié. Elle ne confère toutefois pas à PolyGest le droit de produire une FEC sans passer par un système homologué. Il décrit notamment les obligations des utilisateurs de dispositifs physiques : équipement des lieux de vente, affichage destiné aux clients, émission systématique, accès aux contrôles, dispositif de remplacement et régularisation des ventes non facturées lors d'un dysfonctionnement.

La DGI a publié en 2026 des notes sur les spécifications techniques et la procédure d'homologation des SFE/SECeF, ainsi qu'un communiqué lançant la procédure d'homologation des systèmes de facturation d'entreprise.

Le calendrier opérationnel annoncé par le communiqué conjoint DGI/CCI-BF du 28 août 2026 prévoit la mise à disposition des systèmes physiques :
- 7 septembre 2026 pour les contribuables de la DGE et les éditeurs de logiciels ;
- 2 novembre 2026 pour les contribuables relevant du RNI dans les DME ;
- 1er décembre 2026 pour les contribuables relevant du RND dans les DME.
Le communiqué accorde un délai de 30 jours suivant chacune de ces dates pour la mise en conformité. Au 3 novembre 2026, la période de mise à disposition destinée aux contribuables RNI des DME vient donc de commencer. Le texte de ce communiqué est reproduit par la presse locale et attribué aux signatures DGI/CCI-BF ; sa copie PDF officielle doit être conservée dans le dossier réglementaire du projet.

La DGI a ensuite inscrit, le 29 octobre 2026, un communiqué intitulé « Utilisation obligatoire des SECeF par les grandes entreprises ». Son contenu communiqué à la presse précise une utilisation effectivement exigée pour les contribuables de la DGE à compter du 1er janvier 2027. Le site officiel confirme la publication et la date ; le texte intégral n'ayant pas été téléchargé directement depuis le site DGI dans cette recherche, la date du 1er janvier 2027 est consignée comme échéance opérationnelle fortement recoupée mais à joindre au dossier officiel avant implémentation.

Le calendrier cité ne permet pas de déduire une date pour tous les contribuables relevant des DME, notamment les DME/RSI ou d'autres sous-catégories qui ne sont pas explicitement listées dans le communiqué de mise à disposition. Ne pas extrapoler ces dates à l'ensemble des entreprises.

### 4.2 Informations à faire figurer sur la FEC

Le dispositif légal FEC prévoit des informations d'identification du vendeur et du client, la date et le numéro, la description et la quantité, les unités et prix, la ventilation taxable/non taxable justifiée, le taux et montant de TVA, le TTC, les autres taxes éventuelles, l'identifiant du système SECeF, ainsi que des éléments de sécurité et d'authentification, notamment un code d'authentification de transaction et un QR code.

### 4.3 Règles impératives pour PolyGest

- Ne jamais afficher « FEC », « certifiée DGI », « homologuée » ou équivalent sur une facture générée par le moteur PDF standard.
- Ne jamais fabriquer localement un QR code, un code de sécurité ou un numéro ressemblant à une certification fiscale.
- Ne jamais déclarer une transaction « certifiée » avant d'avoir reçu et vérifié le résultat du système SECeF homologué.
- Ne pas intégrer un protocole technique supposé : utiliser uniquement les spécifications et tests officiellement remis par la DGI ou par un fournisseur homologué.
- Si PolyGest souhaite devenir un SFE offert à des clients, ouvrir un chantier séparé d'homologation avec la DGI avant toute commercialisation de la fonction de certification.
- Tant que cette homologation n'est pas obtenue, PolyGest peut gérer les brouillons, devis, données de facture et archives, et préparer une intégration avec un système officiellement homologué ; il ne doit pas se présenter comme substitut certifié à ce système.

Les FEC émises dans le cadre d'un système physique doivent également tenir compte des obligations matérielles prévues par l'arrêté, notamment connectivité GSM, maintenance et procédures de secours. Un connecteur logiciel ne peut pas prétendre couvrir à lui seul ces obligations opérationnelles.

### 4.4 Architecture proposée

Séparer les objets suivants :
1. **Facture commerciale** : contenu, lignes, calculs, client, échéance et statut interne.
2. **Document normalisé** : rendu conforme au régime et au canal applicable, sans prétendre à une certification inexistante.
3. **Résultat fiscal SECeF/FEC** : référence, système, code d'authentification, QR, horodatage, statut et preuve reçue d'un système certifié.
4. **Archive probante** : fichier original, données structurées, réponse du système, empreinte cryptographique et historique d'événements.

L'état commercial d'une facture ne doit pas être confondu avec son état de certification fiscale.

## 5. TVA : taux, exemptions et traitements

### 5.1 Taux de référence

La loi de finances 2025 a fixé le taux normal de TVA à **18 %**. Elle a prévu un taux réduit de **10 %** pour des cas ciblés, notamment :
- prestations d'hébergement et de restauration réalisées par des hôtels, restaurants et établissements assimilés agréés ;
- transport aérien domestique.

Ces taux doivent être stockés dans un référentiel versionné avec date d'effet, catégorie d'opération, conditions d'éligibilité, preuve éventuelle et référence légale. Le taux de 10 % ne doit jamais être offert à n'importe quelle entreprise par simple sélection utilisateur. Les exonérations et régimes particuliers doivent faire l'objet de règles et de justificatifs distincts.

### 5.2 Facture sans TVA n'est pas une TVA à 0 %

Le moteur doit distinguer au minimum :
- fournisseur non autorisé à collecter la TVA ;
- opération taxable au taux normal ;
- opération relevant d'un taux réduit si les critères sont satisfaits ;
- opération exonérée avec le motif légal documenté ;
- opération hors champ, si ce traitement est confirmé.

Pour une entreprise non autorisée à collecter la TVA, la facture ne doit pas contenir de ligne « TVA 0 % » destinée à simuler une facture TTC. Les montants de la facture suivent la présentation exigée pour le régime du fournisseur.

### 5.3 Calculs et arrondis

- Tous les montants sont calculés en décimal exact, jamais avec float/double.
- Le moteur conserve la base, la remise, la base taxable, le taux, la taxe calculée et le total.
- Les remises réduisent la base dans les conditions légales ; les frais accessoires (transport, emballage, assurance, commissions ou frais liés à l'opération) doivent être qualifiés avant de décider s'ils entrent dans la base taxable.
- La règle d'arrondi doit être unique, documentée et testée en CFA ; le choix du niveau d'arrondi (ligne, taux ou document) reste à faire confirmer par un fiscaliste.
- Les taux et règles applicables sont choisis par le serveur à partir du profil fiscal effectif, de la catégorie de l'opération et des règles valides à la date pertinente. Le client ne transmet jamais une taxe calculée comme donnée faisant autorité.

## 6. Fait générateur et exigibilité : impact direct sur les acomptes

Le CGI distingue le fait générateur de l'exigibilité de la TVA. D'après les dispositions consultées de l'article 316 :
- livraison de biens : exigibilité au moment de la livraison ; si la facture est émise avant la livraison, la taxe devient exigible à l'émission de la facture ;
- prestation de services : exigibilité à l'accomplissement de la prestation ; les avances/acompte reçus rendent la TVA exigible sur le montant reçu, même si la prestation n'est pas encore achevée ;
- exception mentionnée pour les redevables soumis à l'impôt sur les bénéfices non commerciaux : exigibilité à l'encaissement du prix des services ;
- travaux immobiliers : exigibilité à l'exécution des travaux ; les avances/acompte reçus rendent la TVA exigible sur le montant versé ;
- importations et services de non-résidents : règles particulières à traiter dans un chantier distinct.

La loi de finances 2025 et les versions récentes du CGI ont également modifié certains cas d'importation. Le système ne doit donc pas généraliser la même date d'exigibilité à toutes les opérations.

### Conséquence pour la facturation partielle de PolyGest

Une facture d'acompte ou de situation ne suffit pas, à elle seule, à connaître le montant de TVA exigible dans tous les cas. Pour les prestations de services et les travaux immobiliers, la date et le montant réellement encaissé peuvent être déterminants.

La V1 peut rester sans rapprochement bancaire ni gestion complète de caisse, mais **elle doit prévoir un registre minimal et auditable des événements fiscaux de paiement** lorsque l'entreprise collecte la TVA et utilise les avances/situations :
- avance ou acompte reçu ;
- paiement reçu ;
- paiement par moyen scriptural ou en espèces ;
- date réelle de réception ;
- montant et devise ;
- facture concernée ;
- justificatif ou référence du reçu ;
- éventuelle retenue de TVA et référence du certificat.

Ce registre ne remplace pas la trésorerie : il ne réalise ni rapprochement bancaire, ni lettrage comptable, ni gestion complète des comptes. Il rend néanmoins possible le calcul des événements d'exigibilité et sera relié au futur module Encaissements.

**Décision à faire valider avant migration :** déterminer quels événements sont obligatoires pour chaque type de transaction, comment traiter les factures anticipées, les situations de travaux et les acomptes non encaissés. Le type de transaction (biens, services, travaux immobiliers, importation/service non-résident, autre) doit être connu.

## 7. Retenue à la source de TVA et moyens de paiement

### 7.1 Retenue à la source de TVA en 2026

La loi de finances 2026, applicable à compter du 1er janvier 2026, prévoit à l'article 334, paragraphe 4, une retenue de 30 % sur le montant de la TVA due :
- par les entreprises exportatrices de biens taxables en régime intérieur éligibles au remboursement de crédit de TVA au sens de l'article 328, ainsi que par les entreprises relevant de la DGE, à l'occasion de leurs achats de biens et services ;
- par les organismes payeurs, à l'occasion de tout paiement au profit des titulaires de commandes publiques résidents.

Cette retenue ne constitue pas une réduction du prix ou une remise commerciale. Elle ne doit pas être déduite du total TTC de la facture comme si la vente avait été moins chère. Elle doit être enregistrée comme un montant retenu à la source, avec :
- montant de TVA facturé ;
- montant de TVA retenu ;
- base et taux de retenue applicables ;
- identité et IFU du fournisseur ;
- acheteur/payeur et catégorie à l'origine de la retenue ;
- date de paiement ;
- référence du certificat délivré ;
- référence de déclaration/reversement, quand disponible.

Le certificat doit être conservé pour permettre le traitement dans les déclarations et crédits de TVA du fournisseur. La déclaration de retenue comporte notamment les informations du fournisseur, l'IFU, les dates et montants de facture et de paiements, ainsi que la retenue opérée. Le certificat individuel remis au fournisseur doit comporter les références de la quittance de paiement.

### 7.2 Plateformes de commerce électronique

La loi de finances 2025 a également complété l'article 334 pour les ventes et prestations réalisées par l'intermédiaire de plateformes de commerce électronique : l'opérateur de la plateforme est chargé de liquider, déclarer et reverser la TVA due sur les ventes/prestations concernées pour le compte des fournisseurs, et de déclarer/reverser la TVA due sur les commissions qu'il perçoit. Cette règle vise l'opérateur de plateforme ; elle ne doit pas être attribuée automatiquement à chaque entreprise utilisant un logiciel de gestion. Si un module de marketplace est un jour intégré à PolyGest, ce rôle et ces obligations devront faire l'objet d'une analyse juridique distincte.

### 7.3 Paiements scripturaux à partir de 1 000 000 FCFA

La loi de finances 2025 a fixé un seuil de 1 000 000 FCFA TTC pour le règlement par moyens scripturaux de certaines acquisitions de biens, services et actifs. Le texte prévoit des conséquences fiscales et pénalités en cas de paiement en espèces non conforme. Cela concerne autant le contrôle des achats que la façon dont le fournisseur enregistre les encaissements concernés.

PolyGest ne doit pas interpréter ce seuil comme une simple préférence commerciale. Le futur écran de réception de paiements doit connaître le moyen de paiement et pouvoir signaler les opérations dépassant le seuil. Le périmètre exact (opérations, fractionnement et sanctions) doit être revu avec un conseil fiscal avant d'en faire un blocage automatique.

## 8. Numérotation, corrections et archivage

### 8.1 Numérotation

L'article 562 exige une série de numéros ininterrompue. Le modèle actuel prévoit des compteurs séparés par entreprise, type et période ; la remise à zéro annuelle ou la coexistence de plusieurs séries ne doit pas être considérée comme automatiquement autorisée.

Avant de définir les séquences :
- faire valider par la DGI/conseil fiscal le format de série et les éventuelles séries par établissement ou point de vente ;
- conserver un lien entre numéro, date, entreprise, établissement et type de document ;
- empêcher toute réutilisation d'un numéro attribué ;
- garder une trace explicite des documents annulés, non délivrés ou rejetés par le système fiscal, avec le motif et la preuve correspondante ;
- assurer l'atomicité de la numérotation en base et la reprise idempotente d'une demande FEC.

Les devis peuvent avoir leur propre série commerciale, distincte de la série légale des factures.

### 8.2 Documents émis, annulations et avoirs

Un document émis ou certifié ne peut pas être supprimé ou modifié silencieusement. Le statut générique « cancelled » prévu dans le modèle actuel doit être affiné : il peut convenir à un brouillon, mais ne doit pas servir à effacer une facture déjà délivrée ou une FEC enregistrée.

La procédure de correction (avoir, facture rectificative, annulation technique ou correction via SECeF) doit être documentée selon les règles officielles du système et validée par un professionnel. Dans l'attente :
- brouillon : modification ou abandon autorisé avec journal ;
- facture émise : immuable ;
- erreur après émission : ouvrir un dossier de correction lié au document original ; ne pas supprimer ni réutiliser le numéro ;
- FEC : conserver la réponse originale de certification et appliquer uniquement le mécanisme de correction autorisé par le système homologué.

### 8.3 Conservation

Le dossier fiscal doit conserver les factures, pièces justificatives, réponses de certification et éléments d'audit pendant au moins la durée légale applicable. La loi consultée prévoit une conservation de dix ans pour les documents comptables visés ; l'arrêté FEC impose aussi une lisibilité d'au moins dix ans pour certains supports thermiques d'UF.

PolyGest doit donc prévoir :
- stockage privé et contrôle d'accès ;
- conservation du PDF original et des données structurées ;
- empreinte cryptographique du document ;
- journal immuable des émissions, transmissions, corrections et consultations sensibles ;
- politique de rétention d'au moins dix ans, sous réserve des autres délais légaux ou d'un contentieux ;
- export complet et lisible en cas de contrôle ou de cessation du service.

## 9. Modèle de données cible à enrichir

Le modèle conceptuel existant devra être complété par les éléments suivants. Les noms sont indicatifs et ne constituent pas du SQL exécutable.

| Entité conceptuelle | Rôle |
|---|---|
| company_billing_profiles | Profil d'identité de facturation courant : IFU, raison sociale, forme juridique, RCCM, adresses, téléphone, coordonnées bancaires à imprimer |
| company_tax_profile_history | Historique daté du régime, sous-régime, service fiscal, rattachement DGE/DME, statut TVA, option/décision et justificatif |
| tax_rule_versions | Taux, exonérations, catégories, base, conditions d'éligibilité, références juridiques, dates d'effet |
| invoice_fiscal_events | Avances/acompte/paiements réellement reçus, dates, moyens, retenues TVA et certificats |
| invoice_fiscal_outputs | Documents normalisés/FEC, système émetteur, statut de certification, code d'authentification, QR, identifiant SECeF, empreinte et réponse |
| company_secef_profiles | Système physique ou SFE utilisé, fournisseur, numéro d'homologation/attestation, validité, établissement/point de vente |
| invoice_corrections | Demandes et pièces de correction reliées à une facture d'origine, sans écrasement du document initial |

Les lignes de devis/facture doivent mémoriser le traitement fiscal réellement appliqué au moment de l'émission : catégorie, base taxable, code de taxe, taux, montant de TVA, exemption et motif légal, ainsi que snapshot du profil fiscal émetteur. Les données fiscales du client (IFU, forme juridique, RCCM, adresse et téléphone) doivent être disponibles lorsque le texte l'exige.

## 10. Plan de livraison recommandé

### Étape A — socle fiscal et facture normalisée
- profil fiscal vérifié et daté ;
- données obligatoires de l'émetteur et du client ;
- référentiel de taux/exonérations versionné ;
- moteur HT/TVA/TTC et facture sans TVA ;
- numéro légal et contrôle de série ;
- document et archive privée.

### Étape B — événements d'exigibilité
- classification biens/services/travaux ;
- enregistrement des avances/acompte et des paiements utiles au calcul de l'exigibilité ;
- lien entre facture, événement et pièce justificative ;
- tests fiscaux de cas de référence validés localement.

### Étape C — FEC / SECeF
- vérifier l'appartenance DGE/DME et l'obligation applicable à la date ;
- intégrer uniquement un SECeF ou SFE officiellement homologué ;
- obtenir la documentation technique, l'attestation, les identifiants et le processus de test auprès de la DGI ;
- isoler l'adaptateur FEC du moteur commercial ;
- passer par un chantier formel d'homologation de PolyGest si le produit est commercialisé en tant que SFE.

### Étape D — encaissements, retenues et trésorerie
- paiements et rapprochements ;
- retenue de TVA et certificats ;
- seuils de paiements scripturaux ;
- lettrage facture/paiement et soldes client.

**La migration SQL ne doit commencer qu'après validation des règles de l'étape A et des dépendances de l'étape B.** La phase FEC est bloquée à tout usage réel tant que l'homologation et les interfaces officielles ne sont pas établies.

## 11. Questions à faire trancher par le fiscaliste / la DGI

1. Le format exact de facture normalisée applicable en 2026 à une entreprise hors DGE/DME et les éléments de sécurité encore exigés.
2. Les exceptions précises à la facture normalisée et à la FEC pour l'activité et la catégorie du client.
3. La portée et les échéances du communiqué DGI du 29 octobre 2026 sur l'utilisation obligatoire des SECeF par les grandes entreprises, ainsi que le calendrier des DME.
4. Le format, les conditions et la preuve de l'option RSI/CME vers RNI et la gestion des changements de régime.
5. Les taux, exonérations, frais accessoires et arrondis pour les secteurs ciblés par PolyGest.
6. Les dates d'exigibilité applicables aux avances, factures anticipées, marchés de travaux et situations successives selon le régime fiscal de l'entreprise.
7. La procédure légale de correction, d'avoir ou d'annulation d'une facture déjà émise ou certifiée.
8. Les cas exacts de retenue de TVA à la source à 30 % et les certificats acceptés.
9. Le seuil de paiement scriptural, le traitement du fractionnement d'une même opération et les contrôles attendus.
10. Les durées de conservation exactes pour chaque catégorie de document et les points de départ des délais.

## 12. Sources officielles consultées

Sources institutionnelles prioritaires. Les pages et documents doivent être recontrôlés avant chaque mise à jour majeure du moteur fiscal.

- DGI — [Régimes d'imposition](https://dgi.bf/regime_imposition/)
- DGI — [FAQ fiscale](https://dgi.bf/faq/)
- DGI — [Instruction administrative relative à la facture normalisée, 7 octobre 2020](https://dgi.bf/wp-content/uploads/2023/10/INSTRUCTION-ADMINISTRATIVE-PORTANT-SUR-LA-FACTURE-NORMALISEE.pdf)
- DGI — [Arrêté n°2025-0049/MEF/SG/DGI du 5 février 2025 relatif aux FEC](https://dgi.bf/wp-content/uploads/2026/01/arrete-portant-Conditions-et-Modalites-demission-de-la-FEC.pdf)
- DGI — [Communiqués](https://dgi.bf/communiques/) (communiqué du 29 octobre 2026 sur l'utilisation obligatoire des SECeF par les grandes entreprises)
- [Reproduction du communiqué conjoint DGI/CCI-BF du 28 août 2026 sur le calendrier de mise à disposition des SECeF](https://www.actualite.bf/communique-conjoint-mise-en-vente-des-systemes-electroniques-certifies-de-facturation/)
- [Reproduction du communiqué DGI sur l'utilisation obligatoire des SECeF par les contribuables de la DGE dès le 1er janvier 2027](https://www.minute.bf/burkina-la-facture-electronique-certifiee-obligatoire-pour-les-grandes-entreprises-des-le-1er-janvier-2027/)
- DGI — [Documentation FEC](https://dgi.bf/facture-electronique-certifie/) et [notes FEC / homologation](https://dgi.bf/note-fec/)
- DGI — [Code général des impôts — version en ligne](https://dgi.bf/verification/CGI)
- Burkina Faso — [Loi de finances 2025](https://douanes.bf/sydoniabf/files/Loi_Finances_2025.pdf)
- Ministère de l'Économie et des Finances — [Loi de finances 2026, Journal officiel spécial n°01](https://www.finances.gov.bf/fileadmin/user_upload/storage/fichiers/jo-N__01-special_Loi_de_finances_2026.pdf)

### Limites documentaires de la recherche

La page publique DGI consultée confirme l'existence des notes techniques et de la procédure d'homologation publiées en janvier 2026, mais les documents techniques complets n'ont pas tous été lisibles dans la consultation. Le contenu du communiqué DGI du 29 octobre 2026 et le calendrier du communiqué conjoint du 28 août 2026 ont été recoupés dans des reproductions de presse ; leurs copies PDF officielles signées doivent être conservées avant de figer les échéances dans le moteur fiscal. La version complète et consolidée du CGI applicable au 3 novembre 2026 doit être relue par le conseil fiscal avant que PolyGest ne présente une règle comme légalement exhaustive.
