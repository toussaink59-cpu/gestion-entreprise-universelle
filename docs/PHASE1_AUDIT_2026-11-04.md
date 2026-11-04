# Audit de consolidation — Phase 1

**Projet :** PolyGest (plateforme web de gestion d’entreprise)  
**Dépôt :** `toussaink59-cpu/gestion-entreprise-universelle`  
**Date de l’audit :** 4 novembre 2026  
**Référence fonctionnelle :** Cahier des charges v0.1 du 19 octobre 2026  
**Branche inspectée :** `docs/matrice-fiscale-burkina-2026`  
**État général :** socle logiciel renforcé et testé ; Phase 1 non clôturée ; aucune validation de mise en production.

---

## 1. Périmètre et méthode

Cet audit porte sur les migrations PostgreSQL, les politiques RLS, les fonctions SQL de sécurité, l’authentification applicative, les invitations, les tests, les workflows CI, les sauvegardes/restaurations et la configuration Supabase locale.

Les constats « validés » ci-dessous reposent sur le code inspecté et sur des exécutions GitHub Actions identifiées. Ils ne certifient pas le comportement d’un projet Supabase hébergé, d’un déploiement public ou d’un environnement de production.

Aucune base hébergée, donnée réelle, donnée client ou donnée de paie n’a été modifiée pendant cet audit.

## 2. Travaux clôturés pendant l’audit

| Référence | Travail | Résultat |
|---|---|---|
| PR #49 | Alignement de la feuille de route sur le cahier des charges | Fusionnée après CI réussie |
| PR #50 | Sécurisation de la création et de l’activation des membres | Fusionnée après CI, tests Supabase réel et restauration réussis |
| PR #51 | Alignement de la configuration Supabase locale sur le parcours d’inscription | Fusionnée après CI, tests Supabase réel et restauration réussis |
| PR #53 | Refus d’une restauration sur une base cible non vide | Fusionnée après CI, ShellCheck et test PostgreSQL de non-régression réussis |
| PR #55 | Audit automatisé de toutes les dépendances (runtime et développement) | Fusionnée après CI réussie : 0 vulnérabilité signalée dans l’arbre complet |
| PR #58 | Suppression du plafond fixe de cinq entreprises dans le MVP | Fusionnée après CI, migrations/tests sur Supabase local réel et test de restauration réussis |

Les PR #49, #50, #51, #53, #55 et #58 sont consultables dans l’historique GitHub du dépôt.

### 2.1 Contrôle d’accès des membres

Le parcours de création d’une appartenance est désormais réservé aux fonctions SQL sécurisées. Les rôles applicatifs `anon` et `authenticated` n’ont plus de droit INSERT direct sur `public.company_memberships`, et l’ancienne politique d’insertion directe est supprimée.

La fonction d’invitation crée l’appartenance et le jeton dans la même transaction. Le jeton est aléatoire, son empreinte SHA-256 est stockée, il est à usage unique et sa confirmation est liée à l’adresse e-mail du compte destinataire. L’activation reste réservée au propriétaire après confirmation.

Une garde SQL additionnelle refuse également une insertion directe au statut `active`, tout en conservant l’exception strictement nécessaire à la création du premier propriétaire par `create_company()`.

Cette correction ferme deux chemins de contournement :
- création directe d’un membre déjà actif sans confirmation d’adresse ;
- création d’une appartenance invitée sans jeton, qui aurait pu bloquer une invitation sécurisée ultérieure à cause de l’unicité entreprise/utilisateur.

### 2.2 Configuration locale d’authentification

La configuration Supabase locale est désormais alignée sur l’application :
- confirmation d’adresse e-mail activée ;
- mot de passe minimal de 8 caractères, identique au formulaire et à la validation serveur.

Cela ne prouve pas que ces paramètres sont identiques sur un éventuel projet Supabase hébergé. La vérification distante reste obligatoire avant mise en production.

## 3. Résultats des contrôles automatisés

| Contrôle | Exécution | Résultat |
|---|---|---|
| CI web | PR #50, run `41804376789` | Réussi : lint, build, TypeScript, 12 fichiers de test, 159 tests |
| Audit des dépendances de production | PR #50, run `41804376789` | Réussi : 0 vulnérabilité signalée dans les dépendances de production |
| ShellCheck et encodage UTF-8 | PR #50, run `41804376789` | Réussi |
| Migrations et lint SQL sur Supabase local réel | PR #50, run `41804376887` | Réussi : aucune erreur de schéma, 4 fichiers de test, 78 tests |
| Sauvegarde/restauration de bout en bout | PR #50, run `41804377046` | Réussi |
| CI web | PR #51, run `41804520618` | Réussi |
| Migrations et tests Supabase local réel | PR #51, run `41804520805` | Réussi |
| Sauvegarde/restauration | PR #51, run `41804520416` | Réussi |
| CI et ShellCheck | PR #53, run `41805269946` | Réussi |
| Sauvegarde/restauration et refus d’une cible non vide | PR #53, run `41805269981` | Réussi ; la seconde restauration est refusée et les deux entreprises de test restent présentes |
| CI et audit de toutes les dépendances | PR #55, run `41805636934` | Réussi : 12 fichiers de test, 159 tests, audit complet npm sans vulnérabilité signalée |
| CI complète sur la suppression du plafond | PR #58, run `41807332656` | Réussi : lint, build, TypeScript, tests, audit de toutes les dépendances, ShellCheck et encodage UTF-8 |
| Migrations, lint SQL et tests sur Supabase local réel | PR #58, run `41807332475` | Réussi |
| Sauvegarde/restauration de bout en bout | PR #58, run `41807332620` | Réussi |

Les tests PGlite et les tests sur la pile Supabase locale réelle sont deux couches distinctes. Les résultats ne doivent pas être additionnés comme s’il s’agissait d’une seule suite.

## 4. État des exigences de sécurité

### 4.1 Isolation multi-entreprises — validée sur la base locale

Le schéma public applique la RLS à toutes les tables inspectées. Les tests vérifient notamment :
- lecture et modification par identifiant direct d’une autre entreprise ;
- création et modification d’appartenances hors de son entreprise ;
- visibilité des profils utilisateurs selon l’appartenance ;
- accès anonyme ;
- droits selon les rôles propriétaire, administrateur, finance, employé et auditeur ;
- effet de la révocation d’une appartenance et de la désactivation d’un compte ;
- protection du dernier propriétaire.

La couverture actuelle est solide pour les tables déjà présentes. Chaque nouvelle table métier devra recevoir ses propres politiques RLS et tests négatifs.

### 4.2 Journal d’audit — base validée, couverture métier à étendre

Le journal est protégé contre les modifications et suppressions directes. Les fonctions sensibles vérifient les autorisations et les tests couvrent la création d’entreprise, les changements de rôle et les révocations.

Les futurs modules devront ajouter la traçabilité des validations, annulations, exports sensibles, opérations financières et actions RH/paie. La présence du journal ne signifie pas que ces événements futurs sont déjà couverts.

### 4.3 Authentification — configuration locale alignée

L’application vérifie les données d’inscription côté serveur et impose un mot de passe d’au moins huit caractères. La configuration locale exige maintenant la confirmation de l’adresse e-mail et le même minimum.

Restent à vérifier sur un environnement hébergé : confirmation d’e-mail, SMTP, URLs de redirection, rotation/révocation des sessions, paramètres de récupération, MFA si retenue, limitation effective des tentatives et séparation des clés entre environnements.

### 4.4 En-têtes HTTP — configurés, déploiement non contrôlé

Le projet configure `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS et une CSP limitée aux directives indépendantes du nonce Next.js. Les tests vérifient la présence des règles dans la configuration.

La réponse HTTP réelle d’un déploiement n’a pas été contrôlée. Une CSP stricte avec nonce reste un chantier distinct ; ne pas présenter la CSP actuelle comme une politique complète de blocage des scripts.

### 4.5 Stockage de fichiers privés — non implémenté

L’inspection de l’arborescence ne révèle aucun module d’upload, aucun bucket Supabase déclaré et aucune politique RLS Storage spécifique à l’entreprise.

L’API Storage locale est activée et la configuration générale indique une limite de 50 MiB, mais cela ne constitue pas une implémentation SEC-07. Il manque au minimum :
- bucket privé et règles d’accès par entreprise ;
- contrôle du propriétaire du fichier et des permissions du rôle ;
- contrôle réel du type MIME et de la taille à l’entrée ;
- URL signée temporaire ;
- tests d’accès direct, inter-entreprises et après expiration ;
- stratégie d’analyse des fichiers et de mise en quarantaine avant mise à disposition.

Ce point doit être résolu avant d’autoriser le dépôt de justificatifs, bulletins, factures PDF ou autres documents métier.

## 5. Sauvegarde, restauration et continuité

Les scripts de sauvegarde protègent les fichiers par des permissions locales restrictives, utilisent un fichier temporaire puis un renommage atomique et vérifient qu’une sauvegarde n’est pas vide. Le workflow de restauration crée deux bases jetables, compare les données et une partie importante des définitions de structure/sécurité, puis vérifie l’isolation après restauration.

Le workflow a réussi sur les PR #50 et #51.

Limites non clôturées :
- politique de chiffrement des sauvegardes au repos et en transit ;
- stockage hors site et contrôle de l’accès aux sauvegardes ;
- fréquence et durée de rétention adaptées à la production ;
- définition du RPO et du RTO ;
- procédure de restauration de production, approbations, communication et retour arrière ;
- le script générique de restauration refuse désormais toute base cible contenant des objets applicatifs ; le test de bout en bout vérifie qu’un second lancement est refusé sans modifier les deux entreprises déjà restaurées (PR #53).

Aucune restauration de production n’a été exécutée ni ne doit l’être pendant cette phase.

## 6. Dépendances et CI

L’audit automatique couvre désormais l’arbre complet installé par `npm ci`, dépendances runtime et développement, avec `npm audit --audit-level=high`. L’exécution PR #55 a signalé zéro vulnérabilité. Dependabot reste activé pour les mises à jour hebdomadaires ; les mises à niveau majeures ne sont pas forcées. ShellCheck, le contrôle UTF-8, lint, TypeScript, build et tests sont intégrés à la CI.

## 7. Éléments non vérifiés ou décisions ouvertes

| Sujet | État | Suite nécessaire |
|---|---|---|
| Projet Supabase hébergé | Non vérifié | Identifier l’environnement et vérifier Auth, RLS, Storage, clés, URLs, région et migrations sans toucher à la production |
| Région d’hébergement et résidence des données | À décider | Comparer coûts, disponibilité, traitement des données, exigences contractuelles et obligations locales |
| Protection de la branche principale | Non vérifiée | L’API de protection de branche n’était pas accessible à l’intégration ; aucune règle de dépôt n’a été retournée par l’API rulesets. Ne pas en déduire que la branche est protégée |
| RPO/RTO et rétention | À décider | Définir des objectifs réalistes selon le budget et les engagements de service |
| Stockage privé et analyse antivirus | À concevoir | Définir la matrice d’accès aux documents et le mécanisme de scan/quarantaine |
| Conservation, export et suppression des données personnelles | À formaliser | Politique documentée avant traitement de données réelles |
| Accès exceptionnel du personnel plateforme | À formaliser | Accès minimal, durée limitée, justification et journalisation |
| Supervision et incidents | À formaliser | Alertes, responsables, escalade, incidents et procédure de reprise |

## 8. Fonctionnalités métier restantes avant MVP

Le dépôt contient les fondations d’entreprise, les membres, les clients et les fournisseurs. Les modules P0 suivants ne doivent pas être déclarés disponibles à ce stade : devis/factures, règlements, dépenses, caisses/comptes manuels, budgets, tableau de bord financier de base et exports.

La paie de base reste P0 dans le MVP, conformément au cahier des charges, mais son développement est planifié après la fondation commerciale et financière. Elle ne doit pas être activée comme paie réglementaire conforme avant validation professionnelle des paramètres locaux.

## 9. Conclusion et ordre de suite

**La fondation multi-entreprises a nettement progressé et les contrôles automatisés passent sur les environnements de test. La Phase 1 n’est toutefois pas clôturée et le projet n’est pas prêt pour une utilisation avec des données réelles.**

Ordre de travail recommandé :
1. terminer les protections opérationnelles restantes : règles de branche, vérifications d’en-têtes sur staging et validation des sauvegardes hébergées ;
2. arrêter les décisions d’hébergement, de sauvegarde et de stockage privé avant toute gestion de documents réels ;
3. terminer la validation de la configuration Supabase hébergée dans un environnement non productif ;
4. clôturer la Phase 1 avec preuves, puis commencer les modules P0 de la Phase 2 ;
5. développer la paie de base en Phase 3 avec règles locales datées et validées avant tout calcul réel.

**Aucune conformité fiscale, comptable, sociale ou de paie n’est certifiée par cet audit technique.**
