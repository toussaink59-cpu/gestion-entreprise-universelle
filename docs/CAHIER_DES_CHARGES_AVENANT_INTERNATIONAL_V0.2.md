# POLYGEST — Avenant n°1 au cahier des charges
## Internationalisation et architecture multi-pays

**Version :** 0.2  
**Date :** 5 novembre 2026  
**Statut :** décisions de cadrage approuvées — complément au cahier des charges v0.1  
**Base technique inspectée :** `0b9ffaca4e119f89387754ffe04969e956823097`

## 1. Portée et autorité
Le présent avenant complète le cahier des charges initial v0.1 du 19 octobre 2026. Il ne supprime aucune exigence métier, de sécurité, de qualité ou de conformité non expressément modifiée. Le cahier applicable est constitué de la v0.1 et du présent avenant v0.2, lus conjointement. L'avenant prévaut uniquement sur les sujets qu'il traite. La version initiale PDF et DOCX reste conservée comme référence historique v0.1. Les décisions décrites sont des exigences de cadrage et ne signifient pas que leur implémentation est déjà livrée.

## 2. Vision internationale
PolyGest est conçu comme un logiciel international dès sa conception, à travers un noyau métier commun et des adaptateurs nationaux isolés.
- Le Burkina Faso reste le premier environnement opérationnel et réglementaire de référence.
- Le français et l'anglais sont les deux langues initiales.
- L'ouverture réglementaire et commerciale se fait pays par pays après validation des besoins, capacités opérationnelles, obligations juridiques, fiscales, sociales et de protection des données.
- International dès la conception ne signifie pas que tous les pays, réglementations, devises ou paiements sont activés dès la première mise en production.

Le système distingue indépendamment : langue utilisateur, pays/juridiction de l'entreprise, devise de référence, devise du document, fuseau horaire et règles applicables selon la période. Ces attributs ne sont jamais déduits automatiquement les uns des autres.

## 3. Noyau commun et adaptateurs nationaux
Le noyau commun couvre selon les priorités du cahier : identité, authentification, entreprises, membres, rôles, clients/fournisseurs, activités, projets, devis, facturation, dépenses, budgets, trésorerie, stocks, équipements, personnel, paie, rapports, documents et audit.

Les règles juridictionnelles sont isolées : fiscalité, facturation légale et certification, numérotation réglementaire, comptabilité, paie/cotisations, documents légaux, conservation et moyens de paiement locaux.

Chaque adaptateur est versionné, testable et documenté par juridiction, régime et dates d'effet, avec source de référence, date de vérification et statut de validation. Une fonction fiscale, comptable ou de paie non validée reste indisponible pour calcul légal réel ou explicitement en simulation. PolyGest ne présente jamais une estimation comme conforme. Burkina Faso est le premier adaptateur ; les nouveaux pays suivent des chantiers séparés.

## 4. Langues et routage
### 4.1 Langues
| Code | Langue | Rôle |
|---|---|---|
| `fr` | Français | Langue par défaut, continuité des routes actuelles |
| `en` | English | Disponible dès la première livraison i18n |

Les variantes régionales ne sont ajoutées que lorsqu'une différence réelle de terminologie ou de format est justifiée.

### 4.2 Préférence utilisateur
Chaque utilisateur possède une préférence linguistique indépendante de l'entreprise consultée. Elle est persistée côté serveur dans le profil existant ou une structure dédiée après audit de RLS, privilèges SQL et chemins de mise à jour. Les visiteurs peuvent choisir une langue via un cookie fonctionnel sans donnée sensible. La langue explicite de l'URL prévaut pour la requête. Une langue inconnue retombe sur le français. La langue ne modifie jamais les paramètres légaux de l'entreprise.

### 4.3 URLs
- Français par défaut sans préfixe pour préserver les routes existantes.
- Anglais sous `/en`.
- Stratégie cible `localePrefix: 'as-needed'`.
- Liens et redirections créés par le mécanisme de routage localisé.
- Préserver les destinations après login, inscription, callback, confirmation e-mail, invitations et déconnexion.
- Valider toute redirection côté serveur contre les redirections ouvertes.

`next-intl` est retenu comme référence, sous réserve de validation dans la version Next.js utilisée. Le fichier `src/proxy.ts` gère déjà la session Supabase : l'i18n doit être composé dans ce même proxy, sans proxy concurrent et sans perte de cookies, headers, redirections ou rafraîchissement de session.

### 4.4 Traductions
Toutes les chaînes visibles, états, erreurs, formulaires, notifications, e-mails et textes d'aide sont localisables. Le serveur expose des codes d'erreur stables ; la présentation est localisée dans l'interface. Les catalogues FR/EN sont centralisés, typés lorsque possible et contrôlés contre les clés manquantes. Un parcours n'est complet que lorsque chargement, vide, succès, erreur et absence de permission sont traduits. Les e-mails et notifications utilisent la langue du destinataire sans affaiblir la sécurité.

Organisation cible indicative :
```text
apps/web/src/i18n/
  routing.ts
  request.ts
  navigation.ts
apps/web/messages/
  fr.json
  en.json
```
L'organisation finale respecte les conventions existantes.

## 5. Pays, devises, dates et fuseaux
### 5.1 Pays
Codes ISO 3166-1 alpha-2. Le défaut `BF` est conservé pour le contexte initial. Un changement de pays d'une entreprise ayant des documents ou données réglementaires doit être contrôlé, autorisé et audité. Les adresses doivent accueillir des structures nationales différentes.

### 5.2 Devises
Codes ISO 4217. `companies.default_currency` reste la devise de référence ; chaque document conserve explicitement sa devise si le module le permet. Les documents transmis/émis gardent leurs snapshots. Les montants sont calculés en décimal exact en base, jamais en flottant binaire. Les décimales dépendent de la devise et de la règle métier. `Intl.NumberFormat` sert à l'affichage seulement, avec locale et devise explicitement fournies.

Des devises différentes ne sont jamais additionnées directement. Une conversion avancée exige source, cible, taux, source de taux, date/heure, précision et traçabilité. Aucun taux ne peut être inventé ou appliqué automatiquement sans décision métier.

### 5.3 Dates/temps
Les instants techniques utilisent une représentation non ambiguë (idéalement `timestamptz`) ; les dates métier sans heure restent des dates. `companies.timezone` conserve un fuseau IANA. Les règles métier liées à la date locale et la numérotation utilisent le fuseau entreprise. La présentation suit la langue et le contexte régional sans modifier les données.

### 5.4 Champs existants
Réutiliser après audit `companies.country_code`, `companies.default_currency` et `companies.timezone`. Les nouvelles migrations sont additives, testées sur une base neuve et sur la pile Supabase locale réelle ; les migrations fusionnées ne sont jamais réécrites.

## 6. Documents et communications
Devis, factures, reçus, exports et rapports conservent les données nécessaires à leur reproduction fidèle. Un document destiné à un tiers fige langue, devise, pays/régime et snapshots pertinents au moment de la transmission/émission. Une préférence modifiée ne traduit ni ne modifie rétroactivement un document transmis.

Les mentions légales, modèles fiscaux, séries et certifications dépendent de l'adaptateur national. Un PDF PolyGest n'est jamais qualifié de document certifié ou de déclaration officielle sans intégration vérifiable et validation compétente.

## 7. Architecture et sécurité
Le socle Next.js, React, TypeScript, Supabase et PostgreSQL est conservé. L'i18n est incrémentale ; aucun microservice, multi-base ou réplica multi-région n'est créé par cet avenant.

Le routage et la langue ne changent pas rôles, permissions, RLS ou isolation multi-entreprises. Les paramètres pays/devise/fuseau à effet métier sont validés côté serveur et journalisés. Le navigateur n'est jamais l'autorité. Les tests négatifs d'isolation restent identiques en FR et EN.

L'ADR-001 reste la référence pour l'hébergement. La région, les transferts transfrontaliers, contrats, sauvegardes, durées de conservation et résidence sont à instruire par marché. Aucun changement d'hébergement ou transfert de données de production n'est autorisé par cet avenant.

## 8. Priorités
L'avenant ne modifie pas les priorités métier P0/P1/P2 de la v0.1 et ne transforme pas P1/P2 en exigences immédiates du MVP.

Chantier transversal i18n à réaliser tôt, en respectant la consolidation Phase 1 :
1. ADR d'internationalisation ;
2. prototype next-intl intégré au proxy Supabase ;
3. routes françaises compatibles et routes anglaises `/en` ;
4. catalogues complets FR/EN ;
5. préférence utilisateur auditée et persistée ;
6. traduction des parcours déjà livrés ;
7. e-mails et notifications concernés ;
8. formatters explicites locale/devise/fuseau ;
9. tests sécurité, accessibilité, auth, routes et isolation.

Les modules P0 de gestion commerciale/financière et de paie restent prioritaires selon la roadmap et doivent respecter ces exigences régionales. Les nouveaux adaptateurs réglementaires, conversions avancées et intégrations locales progressent ensuite selon les validations et marchés.

## 9. Exigences non fonctionnelles
- Une donnée métier reste identique quel que soit l'affichage linguistique.
- Aucun parcours servi ne mélange des langues involontairement.
- Formats et conversions n'altèrent jamais les montants persistés.
- Les dates métier et instants conservent leur sémantique.
- Sécurité, RLS et isolation sont équivalentes en FR et EN.
- Traductions et adaptateurs évoluent sans réécrire le noyau.
- Parcours accessibles au clavier et aux technologies d'assistance.
- Catalogues/paramètres non nécessaires non chargés sans besoin.
- Portabilité SQL et exportabilité préservées.

## 10. Critères d'acceptation
| ID | Critère | Preuve |
|---|---|---|
| INT-01 | Français et anglais disponibles sur les parcours livrés | Tests et revue des catalogues |
| INT-02 | Routes françaises existantes compatibles | Tests E2E/redirections |
| INT-03 | Anglais sous `/en` | Tests E2E |
| INT-04 | Préférence linguistique persistante | Navigation, déconnexion/reconnexion |
| INT-05 | Langue indépendante du pays/devise/régime | Tests utilisateur EN + entreprise BF/XOF |
| INT-06 | Proxy Supabase et i18n coexistent | Parcours auth/invitations |
| INT-07 | E-mails/notifications localisés | Tests modèles/liens |
| INT-08 | Dates, montants, nombres formatés | Tests FR/EN, devises, fuseaux |
| INT-09 | Calculs indépendants de la locale | Identité des valeurs/totaux |
| INT-10 | Documents figent langue/devise/snapshots | Tests d'immuabilité |
| INT-11 | Fonctions non validées non présentées comme conformes | Tests simulation/refus |
| INT-12 | Permissions/RLS identiques FR/EN | Tests positifs/négatifs |
| INT-13 | APIs, webhooks, fichiers et callbacks non cassés | Tests non-régression |
| INT-14 | Traductions complètes et accessibles | Contrôle des clés/accessibilité |
| INT-15 | CI, build et tests existants verts | CI réussie sur PR |

Une route HTTP 200 ou une capture d'écran ne suffit pas : les flux complets doivent être testés.

## 11. Hors périmètre
Cet avenant ne déclenche pas l'activation réglementaire de tous les pays, la certification de PolyGest, la conversion automatique, une architecture multi-région/multi-base, le choix final de région, de nouveaux prestataires de paiement, la refonte auth/RLS ou l'ajout immédiat d'autres langues.

## 12. Décisions approuvées et ouvertes
Approuvées le 5 novembre 2026 : logiciel international dès sa conception ; français et anglais ; français par défaut sans préfixe ; anglais sous `/en` ; `next-intl` après validation de prototype ; noyau commun et adaptateurs nationaux ; Burkina Faso comme premier environnement réglementaire ; conservation Next.js, Supabase et PostgreSQL.

Restent ouvertes : région d'hébergement, ordre des pays suivants, validations juridiques/sociales locales, change avancé, groupe/filiales multi-pays et variantes régionales.

## 13. Traçabilité
Chaque exigence est reliée à des issues, PR, tests et critères d'acceptation. Les règles réglementaires conservent sources et dates de vérification. Les changements d'architecture sont documentés par ADR. Les statuts « spécifié », « développé », « testé », « validé » et « disponible en production » restent distincts.

## 14. Références
- Cahier des charges v0.1 : `docs/CAHIER_DES_CHARGES.pdf` et DOCX.
- Roadmap : `docs/ROADMAP.md`.
- Architecture : `docs/ARCHITECTURE.md`.
- ADR-001 : `docs/adr/0001-socle-technique.md`.
- ADR-002 : `docs/adr/0002-internationalisation-fr-en-multi-pays.md`.
- Norme frontend : `docs/FRONTEND_SECURITY_STANDARD.md`.
- next-intl : https://next-intl.dev/docs/routing/configuration et https://next-intl.dev/docs/routing/middleware.

**Fin de l'avenant n°1 — Version 0.2 — 5 novembre 2026.**
