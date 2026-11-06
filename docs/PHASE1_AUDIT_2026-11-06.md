# Audit de consolidation — Phase 1

**Projet :** PolyGest  
**Dépôt :** `toussaink59-cpu/gestion-entreprise-universelle`  
**Date de l’audit :** 6 novembre 2026  
**Branche inspectée :** `main`  
**Commit inspecté :** `f4f179570bdb0c23b2aed31d1579e29bf55adff6`  
**Référence fonctionnelle :** cahier des charges v0.1 et avenant international v0.2  
**État général :** fondation renforcée, CI et déploiement Production vérifiés ; Phase 1 non clôturée ; aucun feu vert pour les données réelles.

---

## 1. Périmètre et méthode

Cet état complète l’audit historique du 4 novembre 2026. Il s’appuie sur le code de `main`, l’historique des PRs, les exécutions GitHub Actions, les workflows de déploiement, la spécification du stockage privé et les résultats de synchronisation locale fournis par le propriétaire du projet.

La synchronisation locale a confirmé que `main` est alignée sur `origin/main` (0 commit en avance, 0 en retard). Le fichier local non suivi `apps/web/public/polygest.png` et les trois stashes ont été conservés ; aucun stash n’a été appliqué ou supprimé pendant cet audit.

Les contrôles des workflows sur Supabase utilisent une pile locale temporaire. Ils ne certifient pas le comportement d’un projet Supabase hébergé. Le déploiement Vercel Production et la vérification de ses en-têtes HTTP sont des preuves distinctes ; ils ne remplacent pas une validation fonctionnelle complète en navigateur ni un test d’un environnement Preview/staging.

Aucune base Supabase hébergée, donnée réelle, donnée client ou donnée de paie n’a été modifiée pendant cet audit.

## 2. Évolutions intégrées depuis l’audit précédent

### 2.1 Internationalisation FR/EN

Les PRs #87, #88, #91 et #92 ont introduit le socle FR/EN, les parcours d’authentification/récupération et la préférence linguistique persistante, avec le proxy Supabase SSR et la préservation de l’état des sessions.

Les PRs #95 à #103 ont étendu les formats et les traductions aux parcours actuellement livrés : tableau de bord, clients/fournisseurs, devis, dépenses, gestion des membres et des entreprises, ainsi que l’acceptation des invitations. Les PRs #99 et #101 ont été clôturées sans fusion et remplacées par les lots fusionnés #100 et #102.

Le socle est donc bien implémenté pour les parcours existants. La localisation reste une exigence transversale pour toute nouvelle fonctionnalité ; elle ne signifie pas que les futurs modules métier sont déjà construits.

### 2.2 Factures brouillons — première livraison Phase 2

La PR #104 ajoute une fondation serveur pour :
- enregistrer une facture brouillon autonome ;
- créer une facture brouillon à partir d’un devis accepté, en reprenant le client, la devise et les lignes ;
- abandonner un brouillon tout en conservant une trace ;
- appliquer les vérifications de permissions, d’isolation, de cohérence du client source et de doublons.

**Limite explicitement retenue dans la PR :** aucune interface utilisateur de facturation n’est incluse. L’émission, la numérotation légale, la TVA, les snapshots fiscaux, les règlements et les avoirs/corrections restent hors périmètre de cette livraison et en attente de validation appropriée.

### 2.3 Identité visuelle

La PR #105 intègre le logo vectorisé PolyGest, le composant `BrandLogo` et les icônes d’application. La PR indique que le SVG est une vectorisation automatique ; un fichier vectoriel source, s’il existe, devra le remplacer. La palette d’accent de l’interface reste à arbitrer avec l’identité du logo.

## 3. Contrôles récents vérifiés

| Contrôle | Référence | Résultat |
|---|---|---|
| CI sur `main` | Run #249 — `42190323801`, commit `18c04d0` | Réussi : lint, build, TypeScript, tests, audit des dépendances runtime/développement |
| Scripts et encodage | Job `Scripts shell — shellcheck` du run #249 | Réussi : ShellCheck et contrôle UTF-8 |
| Migrations, lint SQL et tests Supabase local réel après #104 | Run `42189595280`, commit `a7b6d16` | Réussi |
| Sauvegarde/restauration après #104 | Run `42189595208`, commit `a7b6d16` | Réussi |
| Déploiement Vercel Production | Run #33 — `42190323753`, commit `18c04d0` | Réussi |
| En-têtes HTTP après déploiement | Étape du run #33 | Réussi sur `/`, `/login` et `/dashboard` |

Le workflow Production attend les contrôles requis sur le commit exact avant de déployer. Le script HTTP vérifie les réponses 2xx après redirection, l’origine finale et la présence/valeur des en-têtes de sécurité attendus, notamment HSTS, CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` et `Permissions-Policy`.

Ces résultats ne remplacent pas une revue visuelle et fonctionnelle de tous les parcours, une vérification d’authentification réelle ou une validation de staging.

## 4. État des exigences de la Phase 1

### 4.1 Authentification, rôles et isolation multi-entreprises — base locale renforcée

Les contrôles historiques de l’audit du 4 novembre restent applicables aux migrations et tables alors inspectées. Les évolutions récentes FR/EN n’annoncent pas de modification des règles métier RLS dans les PRs de traduction. Les tests présents dans la CI et les workflows Supabase locaux passent sur les révisions vérifiées.

Chaque nouvelle table, RPC, action serveur et export devra toutefois conserver des tests d’accès positifs et négatifs, avec isolation interentreprises.

### 4.2 CI et déploiement — contrôles récents verts

La CI de `main` est verte sur le commit inspecté. Le déploiement Vercel Production et le contrôle automatisé des en-têtes HTTP ont également réussi sur ce commit.

Le contrôle d’en-têtes confirme les réponses publiques vérifiées, pas une validation exhaustive des parcours métier, de la CSP avec nonce ou d’un environnement distinct de préproduction.

### 4.3 Stockage privé — fondation présente, fonctionnalité documentaire différée

La spécification `docs/STOCKAGE_DOCUMENTS_PRIVES.md` et la migration `20261104120000_stockage_prive_documents.sql` confirment le bucket privé, les métadonnées, les contrôles d’accès et les états `pending_upload`, `pending_scan`, `available` et `rejected`.

**Décision économique pour la Phase 1 : le dépôt et la consultation de documents sont différés.** Aucun abonnement ni service antivirus payant ne sera ajouté au MVP à ce stade.

- `DOCUMENT_SCANNER_ENABLED=false` doit rester la valeur par défaut dans tous les environnements.
- Les dépôts doivent rester refusés côté interface et côté API ; ne pas exposer de parcours permettant de contourner ce verrou.
- Les fichiers en attente (`pending_upload` ou `pending_scan`) et rejetés ne doivent jamais être téléchargeables.
- Aucun document ne doit être marqué `available` sans analyse réelle côté serveur.
- Le nettoyage des réservations abandonnées, la quarantaine et la rétention des fichiers rejetés sont reportés avec la fonctionnalité documentaire.
- Le bucket et les secrets Storage hébergés ne sont pas à provisionner tant que cette fonctionnalité reste désactivée.

**Critère de clôture Phase 1 :** le scanner antivirus n'est plus un travail à financer ou à intégrer maintenant, à condition que l'inaccessibilité des dépôts soit démontrée par des tests côté serveur et que la fonctionnalité reste explicitement hors périmètre de la mise en service initiale. Toute réactivation future exige une analyse serveur réelle, des tests de sécurité et une validation de l'environnement cible.

### 4.4 Supabase hébergé — non vérifié

Les exécutions « Supabase réel » réussies utilisent la pile Supabase locale des workflows GitHub Actions. Aucun accès à un projet Supabase hébergé non productif n’a été confirmé pendant cet audit.

Restent à vérifier, dans un environnement non productif identifié :
- région et paramètres d’hébergement ;
- migrations et configuration Auth ;
- URLs de redirection, confirmation e-mail, SMTP et secrets ;
- bucket privé, règles Storage et clés serveur ;
- politiques de sauvegarde et accès opérationnels.

Aucune migration ne doit être envoyée sur la production dans le cadre de cet audit.

### 4.5 Environnements Vercel — Production vérifiée, Preview/staging non démontré

Le workflow du 6 novembre a déployé `main` sur Vercel Production et a vérifié les en-têtes HTTP de trois routes publiques.

Aucune preuve d’une validation complète sur un environnement Preview/staging distinct n’a été recueillie ici. Le workflow permet un déploiement Preview manuel après contrôles, mais sa disponibilité dans le fichier YAML ne constitue pas une preuve qu’un environnement de préproduction est provisionné et testé.

### 4.6 Gouvernance de la branche principale

Le précédent addendum de l’audit signalait que `main` n’avait pas de protection de branche et que le propriétaire avait choisi de ne pas modifier ce réglage à ce moment-là. L’API des rulesets retourne actuellement une liste vide. L’API de protection de branche n’est pas accessible à l’intégration utilisée pendant ce contrôle (réponse 403) ; l’état complet doit donc être vérifié manuellement dans les paramètres GitHub.

Ne pas présenter la protection de branche comme active. Les pushes directs sur `main` restent un risque de gouvernance tant qu’une règle de protection et ses contrôles requis ne sont pas effectivement configurés. La décision antérieure du propriétaire de ne pas l’activer doit rester explicite.

### 4.7 Sauvegarde, restauration et continuité

Les scripts versionnés protègent le répertoire local de sauvegarde (`chmod 700`), limitent les fichiers (`chmod 600`), écrivent d’abord dans un fichier temporaire puis effectuent un renommage atomique. Le script de restauration refuse une cible déjà remplie sans la vider. Le workflow de restauration de bout en bout a réussi après l’intégration de #104.

Cela ne prouve pas l’existence d’un dispositif opérationnel hébergé. Restent à définir et vérifier :
- chiffrement des sauvegardes au repos et en transit ;
- stockage hors site, accès minimal et contrôle des restaurations ;
- fréquence, rétention et surveillance des sauvegardes ;
- objectifs RPO/RTO ;
- procédure d’incident, approbations, communication et retour arrière ;
- exercice de restauration dans un environnement hébergé non productif.

Aucune restauration de production n’a été exécutée.

### 4.8 Protection des données et exploitation

Restent à formaliser avant toute utilisation de données réelles :
- conservation, export et suppression des données personnelles ;
- accès exceptionnel du personnel plateforme, limité dans le temps, justifié et journalisé ;
- supervision, alertes, responsabilité d’incident et procédure de reprise ;
- région d’hébergement et résidence des données.

## 5. Périmètre métier actuel — ne pas confondre avec la clôture Phase 1

- **Clients/fournisseurs :** répertoires livrés avec archivage et stockage documentaire privé conditionné au scanner.
- **Devis :** brouillons, transmission, réponse client (acceptation/refus) et annulation contrôlée ; la numérotation est provisoire et interne.
- **Factures :** brouillons côté serveur uniquement ; aucune interface, émission, numérotation légale, taxe ou règlement.
- **Dépenses :** brouillons uniquement ; aucune validation ni paiement.
- **Paiements, trésorerie, budgets, stocks et paie :** non livrés comme modules complets.

La paie de base reste une priorité P0 du MVP selon le cahier des charges, mais son calcul réel demeure conditionné à la validation professionnelle des règles applicables.

## 6. Décision d’audit et ordre de suite

**Décision : la Phase 1 reste NON CLÔTURÉE.** Les contrôles de code, de base locale et de déploiement Production se sont améliorés et les exécutions récentes sont vertes, mais plusieurs conditions d’exploitation et de sécurité ne sont pas démontrées.

Ordre de travail recommandé :

1. maintenir les dépôts documentaires désactivés pour la Phase 1 et démontrer par des tests que l'API refuse tout dépôt et qu'aucun fichier en attente n'est téléchargeable ; reporter scanner, nettoyage, quarantaine et rétention jusqu'à la réactivation future du module ;
2. obtenir l’accès à un projet Supabase non productif et vérifier Auth, migrations, Storage, bucket et secrets sans toucher à la production ;
3. définir la politique de sauvegarde hébergée, le chiffrement, le stockage hors site, la rétention et les objectifs RPO/RTO ; réaliser un exercice de restauration non productif ;
4. démontrer un environnement Preview/staging distinct et valider les parcours et contrôles qui y sont requis ;
5. confirmer manuellement l’état de la protection GitHub de `main`, en conservant explicitement la décision du propriétaire sur le risque de push direct ;
6. formaliser les décisions d’hébergement, de confidentialité, d’accès d’urgence et de gestion des incidents ;
7. produire un procès-verbal de sortie Phase 1 avec preuves récentes, risques résiduels acceptés et approbation du propriétaire.

Aucune conformité fiscale, comptable, sociale ou de paie n’est certifiée par cet audit technique.
