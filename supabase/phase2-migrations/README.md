# Migrations Phase 2 — hors déploiement Phase 1

Les fichiers SQL de ce dossier sont des évolutions métier postérieures à la fondation Phase 1.

## Règles de déploiement

- **Ne pas appliquer ce dossier à la production pendant la clôture de la Phase 1.**
- Le CLI Supabase déploie les migrations placées dans `supabase/migrations/`. Ce dossier séparé n'est donc pas inclus dans un `supabase db push` standard.
- Les tests automatisés chargent les migrations Phase 1 puis celles de ce dossier sur des bases jetables, afin de conserver la couverture des fonctionnalités déjà développées.
- Pour livrer une évolution Phase 2, revoir sa conformité métier, ses permissions, ses tests et son plan de données. Créer alors une nouvelle migration avec `supabase migration new <nom_descriptif>` afin d'obtenir un horodatage postérieur aux migrations déjà livrées dans `supabase/migrations/`, y transférer le SQL approuvé, puis retirer l'ancien fichier de ce dossier. Les tests de base de données (`apps/web/__tests__/db`) restent en place : ils chargent les deux dossiers. Exécuter les contrôles DEV avant toute mise en production.

## Ordre et dépendances

Les bases jetables chargent les deux dossiers triés par nom de fichier. Une migration de ce dossier ne doit donc dépendre que de migrations d'horodatage antérieur, et le préciser en tête de fichier si elle ajoute une contrainte sur une table existante.

## Périmètre historique

Les devis (brouillons, transmission, réponse client) et les dépenses brouillons relèvent fonctionnellement de la Phase 2 mais ont été livrés dans `supabase/migrations/` avant la mise en place de cette règle ; ils n'ont pas été déplacés afin de ne pas rompre l'historique d'un projet Supabase déjà migré. Avant toute promotion vers la production, le propriétaire doit confirmer explicitement que ces migrations font partie du déploiement.

## Contenu actuel

- `20261105170000_factures_brouillons.sql` : fondation serveur des factures brouillons. Elle ne réalise aucune émission légale, numérotation fiscale, taxation ou règlement.

Aucune migration de ce dossier ne doit être envoyée en production par automatisme.
