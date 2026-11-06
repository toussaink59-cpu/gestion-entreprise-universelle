# Migrations Phase 2 — hors déploiement Phase 1

Les fichiers SQL de ce dossier sont des évolutions métier postérieures à la fondation Phase 1.

## Règles de déploiement

- **Ne pas appliquer ce dossier à la production pendant la clôture de la Phase 1.**
- Le CLI Supabase déploie les migrations placées dans `supabase/migrations/`. Ce dossier séparé n'est donc pas inclus dans un `supabase db push` standard.
- Les tests automatisés chargent les migrations Phase 1 puis celles de ce dossier sur des bases jetables, afin de conserver la couverture des fonctionnalités déjà développées.
- Pour livrer une évolution Phase 2, revoir sa conformité métier, ses permissions, ses tests et son plan de données. Créer alors une nouvelle migration avec `supabase migration new <nom_descriptif>` afin d'obtenir un horodatage postérieur aux migrations déjà livrées en Phase 1, y transférer le SQL approuvé, puis retirer le fichier de test de ce dossier. Exécuter les contrôles DEV avant toute mise en production.

## Contenu actuel

- `20261105170000_factures_brouillons.sql` : fondation serveur des factures brouillons. Elle ne réalise aucune émission légale, numérotation fiscale, taxation ou règlement.

Aucune migration de ce dossier ne doit être envoyée en production par automatisme.
