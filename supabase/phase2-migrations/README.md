# Phase 2 — migrations en préparation

Ce dossier documente les règles de préparation des évolutions de la Phase 2. Les migrations destinées à être livrées sont générées directement dans `supabase/migrations/`.

## Règles de sécurité et de livraison

- La branche `main` reste la référence de production.
- Toute évolution Phase 2 doit passer par une Pull Request et les contrôles CI requis.
- Créer chaque migration avec `npx supabase@3.0.0 migration new <nom_descriptif>`.
- Ne jamais modifier ou déplacer une migration déjà appliquée sur une base hébergée.
- Conserver les tests sur des bases locales jetables.
- Ne jamais exécuter `supabase db push` sur DEV ou Production sans autorisation explicite.
- Ne pas activer une fonctionnalité avant sa validation sur l'environnement cible.

## Factures brouillons — premier lot

La migration `20261109161232_factures_brouillons.sql` se trouve désormais dans `supabase/migrations/`.

Elle constitue la fondation serveur des factures brouillons. Elle ne met en œuvre aucune émission légale, numérotation fiscale, taxation ou règlement.

La migration est en cours de revue et de validation locale. Elle n'a pas été appliquée aux projets Supabase hébergés.

L'interface reste désactivée par défaut (`POLYGEST_INVOICES_ENABLED=false`). Ne pas activer cette fonctionnalité avant validation de la migration et tests de fumée sur l'environnement cible.

## Documents

Le verrouillage serveur des documents reste en vigueur. Ne pas activer `DOCUMENT_SCANNER_ENABLED` et ne pas rétablir les opérations d'envoi tant que le dispositif de scan n'est pas disponible et validé.

## Historique des environnements hébergés

Au relevé du 8 novembre 2026, les projets Supabase Production (`gestion-entreprise-universelle`) et DEV (`gestion-entreprise-universelle-dev`) avaient les mêmes 18 migrations Phase 1 enregistrées.

Les migrations déjà appliquées sur ces projets ne doivent pas être déplacées ni rejouées. Toute nouvelle migration doit conserver un horodatage postérieur à l'historique existant.

La présence d'une migration dans `supabase/migrations/` n'autorise pas son déploiement sur un projet hébergé.
