# Stockage privé des documents d'entreprise

**Statut :** fonctionnalité documentaire différée pour la Phase 1 afin de maîtriser les coûts. Dépôts et téléchargements désactivés jusqu'à l'intégration ultérieure d'un scanner serveur.  
**Référence :** cahier des charges v0.1, exigences FR-DOC-01 et SEC-07.  
**Édition :** 4 novembre 2026 — TTL de téléchargement approuvé : 120 secondes.  
**Politique approuvée :** 4 novembre 2026.

## 1. Politique produit approuvée

> **Décision Phase 1 :** le module de pièces jointes n'est pas ouvert à l'utilisation. Aucun service antivirus payant ne sera ajouté au MVP. Le verrou serveur doit rester fermé ; cette décision ne constitue pas une validation de fichiers sans scan.

- Un bucket privé distinct des fichiers publics.
- Accès par entreprise, limité aux permissions du module métier auquel la pièce est rattachée.
- Formats autorisés : PDF, JPEG, PNG et WebP.
- Taille maximale : 20 Mio par fichier.
- Liens de téléchargement signés : **120 secondes**.
- Un fichier ne devient téléchargeable qu'après une analyse de sécurité côté serveur concluante.

Les mêmes contrôles sont appliqués indépendamment des éléments d'interface : masquer un bouton ne constitue jamais une autorisation.

## 2. Architecture technique

### Bucket

Nom : `company-private-documents`.

Configuration locale dans `supabase/config.toml` :
- `public = false` ;
- `file_size_limit = 20MiB` ;
- `allowed_mime_types = application/pdf, image/jpeg, image/png, image/webp`.

Le bucket est déclaré par la configuration Storage locale. Sur un projet hébergé, il doit être provisionné et vérifié par l'API Storage ou le Dashboard avant activation ; la migration SQL ne modifie pas directement les tables internes `storage.*`.

### Métadonnées

La table `public.documents` conserve :
- entreprise, module, type et identifiant de la fiche parente ;
- chemin Storage opaque `company_id/document_id` ;
- nom de fichier affichable, type déclaré, taille et empreinte SHA-256 ;
- état d'envoi et d'analyse, dates, créateur.

Les noms de fichier fournis par l'utilisateur ne sont jamais utilisés comme chemin de stockage.

La RLS de `documents` permet de consulter une pièce si le membre possède `read` sur le module parent. Un utilisateur qui possède uniquement `create` peut voir les métadonnées de ses propres fichiers en attente, mais cette exception ne lui donne pas accès au binaire.

### Dépôt

1. Le navigateur authentifié demande une réservation avec entreprise, fiche et caractéristiques du fichier.
2. La RPC `create_document_upload` vérifie à nouveau le JWT, la permission `create` du module et l'appartenance réelle de la fiche à l'entreprise, puis crée les métadonnées dans une transaction.
3. Le serveur génère un jeton d'upload signé, limité à un chemin unique, sans autoriser l'écrasement.
4. Le navigateur transfère directement le binaire vers Storage. Le fichier ne traverse donc pas une fonction applicative intermédiaire.
5. Le serveur finalise la session ; le statut passe de `pending_upload` à `pending_scan`.

**Durée du jeton d'upload :** Supabase documente actuellement une validité de deux heures pour `createSignedUploadUrl`. Cette durée concerne seulement le dépôt. L'utilisateur a approuvé un TTL distinct de **120 secondes pour les liens de téléchargement**. La méthode SDK de création d'un lien de téléchargement accepte explicitement la durée en secondes. Références : [API Storage JavaScript](https://github.com/supabase/storage-js/blob/main/src/packages/StorageFileApi.ts) et [configuration Supabase CLI](https://supabase.com/docs/guides/local-development/cli/config).

### Lecture et téléchargement

1. Le serveur authentifie le membre et lit la métadonnée via la RLS de `documents`.
2. Les états `pending_upload`, `pending_scan` et `rejected` sont refusés.
3. Pour un document `available`, le serveur demande à Storage une URL signée avec le client JWT du membre.
4. La policy `storage.objects` revérifie la permission `read` sur le module parent.
5. L'URL de téléchargement expire après **120 secondes** ; les réponses de l'API ne sont pas mises en cache.

La permission est vérifiée lors de la création de l'URL. Comme pour tout lien signé, un lien déjà émis peut rester utilisable jusqu'à son expiration : le TTL court limite cette fenêtre.

## 3. Analyse de sécurité — blocage par défaut

Les états possibles sont :
- `pending_upload` : réservation créée, binaire pas encore finalisé ;
- `pending_scan` : binaire reçu, en attente d'analyse ;
- `available` : analyse serveur positive, avec type réel, taille réelle et SHA-256 ;
- `rejected` : fichier bloqué.

Seule la clé serveur `SUPABASE_SERVICE_ROLE_KEY` peut appeler `complete_document_upload` et `complete_document_scan`. Elle n'est jamais importée dans un composant navigateur. Le navigateur peut effectuer un contrôle préliminaire de signature pour améliorer l'expérience, mais ce contrôle n'est pas une preuve de sécurité.

**Limite volontaire et décision de périmètre : aucun moteur antivirus / scanner n'est branché, et le module documentaire est différé pour la Phase 1.** La variable serveur `DOCUMENT_SCANNER_ENABLED` doit rester à `false` dans tous les environnements ; la réservation et le dépôt de nouveaux fichiers doivent être refusés côté interface et côté API. Ne jamais activer cette variable seule, ni exposer un chemin alternatif de dépôt. Les documents existants restent `pending_scan` et aucun lien de téléchargement ne leur est délivré. La RPC de finalisation exige le type réellement détecté, la taille réelle et l'empreinte SHA-256 ; elle est réservée au service serveur. Il ne faut pas marquer un fichier comme propre sur la seule base de son nom, de son extension, de son en-tête HTTP ou du résultat du navigateur.

Lors d'une future réactivation du dépôt documentaire, un moteur de scan doit :
- récupérer le fichier dans un environnement isolé ;
- inspecter le contenu réel et rechercher les contenus malveillants ;
- retourner le type, la taille et l'empreinte calculés sur les octets reçus ;
- appeler la RPC de finalisation en tant que service serveur ;
- placer les résultats douteux ou non pris en charge en état `rejected`.

Le nettoyage planifié des réservations `pending_upload` abandonnées et la quarantaine/rétention des fichiers rejetés sont également différés avec le module. Ils devront être livrés avant toute réactivation.

## 4. Périmètre d'interface actuel

Le panneau de pièces jointes est intégré aux fiches clients et fournisseurs. Le modèle de données prévoit les modules devis/factures, paiements, dépenses, trésorerie, budgets, personnel/paie, membres et audit pour leurs livraisons respectives. Aucun écran de pièces jointes n'est ajouté à un module métier qui n'existe pas encore.

## 5. Secrets et environnements

- `SUPABASE_SERVICE_ROLE_KEY` est strictement serveur, stockée dans le gestionnaire de secrets de chaque environnement.
- Jamais de clé service-role dans `NEXT_PUBLIC_*`, le navigateur, le dépôt ou les logs.
- Le bucket local est configuré par `supabase/config.toml`.
- Le projet Supabase hébergé, ses paramètres de stockage et les secrets d'environnement ne sont pas vérifiés par ce changement.
- Aucune migration ni aucun stockage de production n'a été modifié.

## 6. Tests

La PR #65 a été fusionnée dans `main` (commit `43611ad73a032a99186818c7a8cbaa33188f474b`). Les contrôles exécutés avant fusion ont réussi : CI web (run `41819650036`, 14 fichiers / 178 tests, audit des dépendances à zéro vulnérabilité), Supabase réel avec Storage (run `41819650061`, 5 fichiers / 92 tests et lint `plpgsql_check`) et restauration (run `41819650069`). La prévisualisation Vercel de la PR n'a pas été déployée : le quota quotidien gratuit de déploiements était atteint ; aucune validation d'une URL de prévisualisation ou d'un déploiement hébergé n'est revendiquée.


La suite couvre :
- signatures PDF/JPEG/PNG/WebP, formats non reconnus, limite 20 Mio et nettoyage du nom ;
- configuration privée du bucket ;
- contrôle d'appartenance de la fiche, permissions de dépôt et accès inter-entreprises ;
- refus des insertions directes par les utilisateurs ;
- refus de lecture avant scan et après rejet ;
- finalisation réservée au rôle serveur ;
- accès Storage seulement après état `available` et permission de lecture du module.

Les tests de la pile Supabase réelle doivent démarrer Storage ; le workflow `.github/workflows/supabase-reel.yml` est ajusté à cet effet. Les tests PGlite utilisent une doublure minimale de Storage et des fichiers fictifs, sans binaire réel.
