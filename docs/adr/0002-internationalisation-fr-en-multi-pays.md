# ADR-002 — Internationalisation FR/EN et architecture multi-pays

- **Statut :** accepté
- **Date :** 5 novembre 2026
- **Base :** `0b9ffaca4e119f89387754ffe04969e956823097`
- **Référence :** cahier des charges v0.1 complété par l'avenant n°1 v0.2

## Contexte

PolyGest doit être international dès sa conception, avec le français et l'anglais disponibles dès le départ. Le Burkina Faso reste le premier marché opérationnel et réglementaire de référence. Le projet utilise Next.js, React, TypeScript, Supabase SSR et PostgreSQL.

Les entreprises disposent déjà de `country_code`, `default_currency` et `timezone`. Le profil utilisateur existe ; `src/proxy.ts` gère les sessions Supabase. Le layout impose actuellement `lang="fr"` et certains formatters utilisent `fr-FR` en dur. L'i18n doit être ajoutée sans casser routes, sessions ou autorisations.

## Décision

1. PolyGest est international dès sa conception ; les langues initiales sont `fr` et `en`.
2. Le français reste la langue par défaut et conserve les routes sans préfixe.
3. L'anglais utilise `/en` ; stratégie cible `localePrefix: 'as-needed'`.
4. `next-intl` est retenu comme solution de référence après validation d'un prototype dans les versions Next.js en place.
5. Le routage next-intl est composé avec le proxy Supabase existant `src/proxy.ts`. Un seul proxy cohérent est conservé.
6. La préférence utilisateur est indépendante du pays, de la devise et du fuseau de l'entreprise. Sa persistance serveur intervient après audit RLS/privilèges.
7. Les codes pays utilisent ISO 3166-1 alpha-2, les devises ISO 4217 et les fuseaux IANA.
8. Les champs existants `companies.country_code`, `default_currency` et `timezone` sont réutilisés ; toute évolution de schéma est additive.
9. Les montants sont calculés en décimal exact en base ; `Intl.NumberFormat` est réservé à la présentation. Aucun mélange de devises sans conversion datée, sourcée et traçable.
10. Fiscalité, facturation légale, comptabilité et paie sont isolées par pays/régime/période et activées uniquement après validation.
11. Next.js + Supabase + PostgreSQL sont conservés. Pas de multi-base, réplication multi-région ou migration de prestataire.
12. Région d'hébergement et transferts restent ouverts dans ADR-001.

## Conséquences

- Interface, messages, e-mails et états de tous les parcours livrés sont localisables.
- Les anciennes routes françaises restent fonctionnelles.
- Les e-mails/invitations conservent contrôles de session, destinataire et redirection.
- Les tests couvrent routes, auth, callbacks, invitations, erreurs, formats et isolation FR/EN.
- Les documents transmis/émis figent langue, devise et snapshots.
- Modules réglementaires multi-pays et conversions avancées restent progressifs.

## Alternatives considérées

- Réécriture globale : rejetée, trop risquée pour routes, sessions, RLS et fonctionnalités livrées.
- Système de traduction maison : écarté au profit de next-intl, sous réserve du prototype.
- Langue déduite du pays : rejetée, un utilisateur peut préférer l'anglais dans une entreprise burkinabè.
- Base par pays immédiatement : écartée, complexité et coût injustifiés.
- Conformité réglementaire de tous les pays dès le MVP : rejetée faute de validation.

## Validation avant mise en œuvre

Le prototype doit démontrer coexistence du proxy Supabase et du routage localisé, compatibilité des routes françaises, accès à `/en`, conservation des cookies/session et paramètres de retour auth, catalogues FR/EN et tests d'isolation/permissions identiques dans les deux langues.

Les exigences détaillées et critères INT-01 à INT-15 sont définis dans `docs/CAHIER_DES_CHARGES_AVENANT_INTERNATIONAL_V0.2.md`.
