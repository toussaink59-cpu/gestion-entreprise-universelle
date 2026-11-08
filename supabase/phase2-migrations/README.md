# Migrations Phase 2 — hors déploiement Phase 1

Les fichiers SQL de ce dossier sont des évolutions métier postérieures à la fondation Phase 1.

## Règles de déploiement

- **Ne pas appliquer ce dossier à la production pendant la clôture de la Phase 1.**
- Le CLI Supabase déploie les migrations placées dans `supabase/migrations/`. Ce dossier séparé n'est donc pas inclus dans un `supabase db push` standard.
- Les tests automatisés chargent les migrations Phase 1 puis celles de ce dossier sur des bases jetables, afin de conserver la couverture des fonctionnalités déjà développées.
- Pour livrer une évolution Phase 2, revoir sa conformité métier, ses permissions, ses tests et son plan de données. Créer alors une nouvelle migration avec `supabase migration new <nom_descriptif>` afin d'obtenir un horodatage postérieur aux migrations déjà livrées en Phase 1, y transférer le SQL approuvé, puis retirer le fichier de test de ce dossier. Exécuter les contrôles DEV avant toute mise en production.

## Contenu actuel

- `20261104130000_devis_brouillons.sql` : devis brouillons (tables, RLS, fonctions de sauvegarde).
- `20261104140000_depenses_brouillons.sql` : dépenses brouillons.
- `20261105090000_devis_valeurs_numeriques_finies.sql` : contrôle des valeurs numériques finies des devis.
- `20261105100000_devis_transmission.sql` : transmission des devis.
- `20261105110000_devis_reponse_client.sql` : réponse client aux devis.
- `20261105170000_factures_brouillons.sql` : fondation serveur des factures brouillons. Elle ne réalise aucune émission légale, numérotation fiscale, taxation ou règlement.

## État constaté sur Supabase hébergé (8 novembre 2026)

Relevé en lecture seule de l'historique des migrations des deux projets Supabase (`gestion-entreprise-universelle-dev` et `gestion-entreprise-universelle`) : les 18 mêmes versions y sont enregistrées, y compris les cinq migrations devis/dépenses de ce dossier (`20261104130000`, `20261104140000`, `20261105090000`, `20261105100000`, `20261105110000`). La migration `20261105170000_factures_brouillons.sql` n'y est pas appliquée.

Conséquences :

- Ne jamais rejouer ces cinq fichiers sur ces projets : leurs objets existent déjà.
- Ces fichiers ne sont plus dans `supabase/migrations/` alors que l'historique distant les contient. Le CLI Supabase peut donc refuser `supabase db push` (versions distantes absentes du dossier local). Décider de la marche à suivre (réparation de l'historique ou retour des fichiers) avant le prochain déploiement.

Aucune migration de ce dossier ne doit être envoyée en production par automatisme.
