# Base de données

Le schéma est la source de vérité du projet ([ADR-001](../docs/adr/0001-socle-technique.md)). Il vit dans des migrations SQL versionnées, appliquées dans l'ordre alphabétique.

## Contenu actuel

Les migrations sont appliquées dans l'ordre chronologique de leur nom. Les migrations déjà fusionnées ne sont jamais réécrites : une correction est apportée par une nouvelle migration additive.

| Migration | Contenu |
|---|---|
| `20261021110000_identite_acces.sql` | Entreprises, profils, rôles, permissions, appartenances, journal d'audit, RLS et création initiale de l'entreprise |
| `20261022160000_clients_fournisseurs.sql` | Répertoires clients et fournisseurs, permissions limitées, archivage et journalisation |
| `20261023130000_garde_appartenances.sql` | Gardes de sécurité sur les appartenances et leurs transitions |
| `20261023160000_gestion_membres.sql` | Opérations contrôlées d'administration des membres |
| `20261023170000_verrouillage_roles_membres.sql` | Protection de l'attribution des rôles et des règles de propriété |
| `20261023190000_invitations_email_securise.sql` | Invitations par e-mail avec jetons opaques à usage unique, stockés sous forme d'empreinte |
| `20261024090000_limite_creation_entreprises.sql` | Migration historique ayant introduit temporairement un plafond de cinq entreprises par propriétaire |
| `20261026093000_securiser_les_invitations.sql` | Renforcement du parcours d'invitation et des conditions d'activation |
| `20261104100000_confirmation_avant_activation_membre.sql` | Blocage des créations directes de membres actifs hors du parcours sécurisé confirmé |
| `20261104110000_supprimer_plafond_fixe_entreprises_mvp.sql` | Suppression du plafond fixe de cinq entreprises dans le MVP, sans réécriture de la migration historique |
| `20261104120000_stockage_prive_documents.sql` | Métadonnées des documents privés, RLS du module parent, autorisation atomique du dépôt et finalisation sécurisée après analyse |

**Règle actuelle de création d'entreprise :** aucun plafond fixe de nombre d'entreprises par propriétaire n'est appliqué au MVP. La migration du 24 octobre est conservée pour l'historique, mais la migration du 4 novembre remplace la fonction `public.create_company()` et retire ce plafond. Les quotas éventuels seront conçus ultérieurement dans le cadre des formules d'abonnement.

## Règles

- Une migration ne se modifie plus une fois fusionnée : toute évolution se fait par une nouvelle migration.
- Toute nouvelle table métier doit être reliée à une entreprise, appliquer la RLS, utiliser des privilèges minimaux et être accompagnée de tests positifs et négatifs.
- Le test de garde-fou échoue si une table du schéma `public` n'a pas la RLS activée.
- Aucune donnée réelle ni aucun secret ne doit être placé dans les migrations, seeds ou jeux de test.

## Lancer les tests

Les tests unitaires et de base de données de l'application utilisent PGlite pour rejouer les migrations dans un environnement PostgreSQL isolé, sans service externe :

```bash
cd apps/web
npm ci
npm test
```

`supabase/tests/auth_shim.sql` émule le schéma `auth` de Supabase (`auth.users`, `auth.uid()`, rôles `anon` et `authenticated`) pour ces tests. Ce shim est réservé aux tests et ne doit jamais être appliqué à un projet hébergé.

La CI comprend aussi un workflow distinct qui démarre la pile Supabase locale réelle, applique les migrations, exécute le lint SQL avec `plpgsql_check` puis les tests contre cette pile. Ces tests sont complémentaires aux tests PGlite.

## Stockage privé des documents

Le bucket local `company-private-documents` est déclaré dans `supabase/config.toml` (privé, 20 Mio, PDF/JPEG/PNG/WebP). Sur un projet hébergé, il doit être provisionné par l'API Storage ou le Dashboard ; les migrations ne modifient pas directement les tables internes `storage.*`.

La table `public.documents` contient les métadonnées et applique les permissions du module parent. Les utilisateurs n'ont aucun droit INSERT direct sur les métadonnées ou les objets Storage. Le dépôt passe par la RPC `create_document_upload`, qui revalide l'identité, la permission `create` et le rattachement de la fiche à la même entreprise, puis le serveur crée un jeton d'upload signé. Le binaire est envoyé directement à Storage.

Les liens de téléchargement sont signés pour 120 secondes et ne sont créés que si l'utilisateur a le droit `read` sur le module parent et si le statut du document est `available`. Les fichiers `pending_upload`, `pending_scan` ou `rejected` restent inaccessibles.

**Limite importante : le scanner antivirus n'est pas encore intégré.** `DOCUMENT_SCANNER_ENABLED=false` par défaut ferme le dépôt côté interface et API. Les fichiers finalisés restent `pending_scan` et ne peuvent pas être téléchargés ; ne passer la variable à `true` qu'après installation et test du scanner. Le TTL d'upload signé défini par Supabase (deux heures) est distinct du TTL de téléchargement approuvé de 120 secondes. Voir [la spécification du stockage documentaire](../docs/STOCKAGE_DOCUMENTS_PRIVES.md).

## Invitations et activation des membres

Le parcours actuel d'invitation :
- réserve la création d'une appartenance à la fonction SQL sécurisée qui crée atomiquement l'appartenance et son jeton ;
- stocke uniquement l'empreinte SHA-256 d'un jeton aléatoire à usage unique, avec expiration après sept jours ;
- envoie le lien d'invitation via le fournisseur e-mail configuré dans l'application (Resend) ;
- exige que le destinataire connecté confirme l'adresse e-mail associée au compte ;
- laisse au propriétaire l'activation finale de l'appartenance après cette confirmation.

Le destinataire doit déjà disposer d'un compte actif associé à l'adresse invitée. La livraison effective des e-mails dépend de la configuration du fournisseur et de l'environnement ; elle n'est pas garantie par les migrations seules. Les rôles applicatifs ne disposent pas d'un droit INSERT direct sur `company_memberships` ni sur les jetons d'invitation.

## Limites connues (à traiter avant production)

- La matrice rôles/permissions est un point de départ **à valider** avec le porteur du projet.
- La configuration Supabase hébergée (Auth, SMTP/fournisseur e-mail, URLs de redirection, secrets, RLS, Storage et migrations) n'a pas encore été vérifiée.
- Le socle de stockage privé est en cours d'intégration : bucket local, métadonnées, permissions héritées et liens signés sont définis ; le scanner antivirus/quarantaine, le nettoyage des sessions abandonnées et la validation du bucket sur Supabase hébergé restent à achever.
- L'accès exceptionnel de l'équipe plateforme aux données clients reste à concevoir (§4 du cahier des charges).
- Les objectifs RPO/RTO, la rétention et le stockage hors site des sauvegardes restent à définir.

## Sauvegarde et restauration (ACC-07)

`scripts/test-restore.sh` prouve de bout en bout qu'une sauvegarde se restaure : il crée une base jetable (migrations + `supabase/tests/seed_restore.sql`, données fictives), la sauvegarde avec `scripts/backup-db.sh`, la restaure dans une base vierge avec `scripts/restore-db.sh`, puis compare les lignes (empreinte par table), la structure (RLS, politiques, déclencheurs, fonctions) et vérifie l'isolation sur la base restaurée.

Il tourne en CI chaque lundi (`.github/workflows/restore-test.yml`), à chaque changement des scripts ou du schéma, et à la demande.

En local, uniquement contre un serveur **jetable** (le script crée et supprime deux bases) :

```bash
ADMIN_URL=postgresql://postgres:motdepasse@localhost:5432/postgres ./scripts/test-restore.sh
```

Limites à connaître :

- Une sauvegarde `pg_dump` **ne contient pas les rôles** du serveur (`anon`, `authenticated`, `service_role`). Restaurer sur un nouveau serveur suppose que ces rôles existent (c'est le cas sur Supabase).
- Ce test valide la procédure sur un serveur PostgreSQL standard avec des données fictives. Il ne remplace ni la configuration des sauvegardes automatiques de l'hébergeur, ni une restauration à blanc sur l'environnement de préproduction.
- Les objectifs de perte et de durée (RPO/RTO) restent à décider (cahier des charges §10).
