# Déploiements PolyGest via GitHub Actions

## Objectif

Éviter qu'un push ou une mise à jour de pull request déclenche automatiquement un build Vercel. GitHub Actions reste le contrôle qualité ; Vercel ne reçoit que les déploiements explicitement autorisés.

## Fonctionnement

- **CI** : le workflow `.github/workflows/ci.yml` continue de s'exécuter sur les pull requests et sur `main` (lint, build, TypeScript, tests, audit et ShellCheck).
- **Preview à la demande** : lancer le workflow `Vercel Deploy` manuellement et fournir une branche ou un SHA. Le workflow vérifie que tous les checks GitHub Actions du commit sont terminés et réussis avant de demander une Preview.
- **Production** : après un événement `push` sur `main`, le workflow `Vercel Deploy` attend la fin du workflow `CI` et ne déploie que si celui-ci a réussi. Il récupère exactement le SHA validé par CI.
- **Sérialisation** : les déploiements PolyGest sont exécutés dans un groupe de concurrence unique pour éviter les builds simultanés inutiles.

Le runner n'exécute pas `npm ci`, les scripts du dépôt ou le build applicatif avec le jeton Vercel présent. Il installe la version figée du CLI sans secret, puis utilise le jeton uniquement pour la commande de déploiement. Le build applicatif est réalisé par Vercel.

## Configuration manuelle requise avant activation

### 1. Déconnecter l'intégration Git du seul projet PolyGest

Dans Vercel :

1. Ouvrir le projet **polygest** dans l'équipe **nex-skill-group**.
2. Aller dans **Settings → Git**.
3. Utiliser **Disconnect** pour ce projet uniquement.

Ne pas désinstaller l'application GitHub Vercel de l'équipe et ne pas modifier le projet FasoShop. La déconnexion du projet PolyGest arrête les déploiements Git automatiques ; le projet et ses domaines restent en place. Les déploiements CLI restent possibles.

**Ne pas utiliser l'Ignored Build Step pour simuler cette déconnexion** : Vercel précise que les déploiements annulés par cette étape comptent quand même dans les quotas de déploiement.

### 2. Ajouter les variables GitHub

Dans le dépôt GitHub, ouvrir **Settings → Secrets and variables → Actions → Variables** et créer :

| Nom | Valeur |
|---|---|
| `VERCEL_ORG_ID` | `team_dXUtQUwMDuCpGFJyjIYliaMC` |
| `VERCEL_PROJECT_ID` | `prj_uSB2zvYyuEueS3565P3qCJbG8hJP` |

Ces identifiants ne sont pas des secrets.

### 3. Ajouter le jeton Vercel

Créer un jeton Vercel à durée limitée, limité à l'équipe **nex-skill-group** et avec les permissions minimales disponibles. Dans GitHub, créer les environnements **preview** et **production** (Settings → Environments), puis ajouter dans chacun un secret nommé `VERCEL_TOKEN`.

Ne jamais placer le jeton dans le dépôt, les variables publiques, les fichiers de configuration ou les journaux.

### 4. Protéger la production

Dans l'environnement GitHub **production**, configurer un approbateur obligatoire si cette option est disponible pour le dépôt. Le workflow ne publie en production qu'après la réussite de CI sur `main`.

## Utilisation

### Preview

1. Ouvrir **Actions → Vercel Deploy → Run workflow**.
2. Saisir la branche ou le SHA souhaité (par exemple `feat/frontend-foundation-shell`).
3. Le workflow refuse le déploiement si les checks GitHub Actions du commit ne sont pas tous verts.
4. Récupérer l'URL Preview dans les journaux du job.

### Production

Fusionner une PR après les contrôles obligatoires. Le workflow de production démarre automatiquement après la réussite du workflow **CI** sur `main`.

## Limites et garde-fous

- Ce mécanisme supprime les builds automatiques déclenchés par Git ; il ne supprime pas les quotas Vercel applicables aux déploiements réellement demandés.
- Chaque Preview ou Production créée via le CLI compte toujours comme un déploiement.
- Les builds Vercel restent soumis aux limites et files d'attente du plan.
- Une seule exécution de déploiement PolyGest est autorisée à la fois.
- FasoShop reste inchangé.
- Ne pas fusionner une PR sur la seule base d'une Preview : les contrôles CI restent obligatoires.
