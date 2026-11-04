# PolyGest — Norme frontend, sécurité et confidentialité

**Statut :** norme obligatoire pour tout développement, correction ou refonte frontend.  
**Périmètre :** Next.js App Router, React, TypeScript, Supabase, navigateur, Server Actions, Route Handlers, stockage documentaire et CI.  
**Priorité :** confidentialité, intégrité, isolation multi-entreprises et absence de secrets serveur côté client.

Cette norme complète `docs/POLYGEST_DESIGN_SYSTEM.md` et le skill `skills/chatgpt-5-4-frontend-skill`. Elle ne remplace ni le cahier des charges, ni les politiques RLS, ni les contrôles backend.

## 1. Règle absolue sur les secrets

Aucun secret serveur ne doit être livré au navigateur, directement ou indirectement.

### Interdictions

Ne jamais exposer dans du code exécuté côté client, le bundle, le HTML, les source maps publiques, les réponses API, les URL, les cookies lisibles par JavaScript, le stockage navigateur ou les logs :
- Supabase `service_role` et toute clé secrète Supabase ;
- mots de passe PostgreSQL, chaînes de connexion et identifiants de base ;
- clés privées, clés de signature/chiffrement et secrets JWT ;
- clés SMTP, e-mail, paiement, stockage, antivirus ou services tiers ;
- jetons d'accès/refresh, cookies de session et credentials d'administration ;
- variables d'environnement serveur, même si elles ne portent pas le mot `SECRET`.

Les noms `NEXT_PUBLIC_*` indiquent explicitement une exposition publique. Ils ne doivent contenir que des valeurs conçues pour être publiques. Une clé Supabase publishable/anon et l'URL du projet peuvent être publiques selon l'architecture Supabase, mais ne constituent jamais une autorisation : RLS et les contrôles serveur restent obligatoires.

### Architecture obligatoire

- Toute intégration privilégiée doit rester dans un module serveur dédié.
- Ajouter `import 'server-only'` aux modules serveur contenant des secrets ou clients privilégiés, lorsque compatible avec le module.
- Les modules partagés avec le navigateur ne doivent importer aucun module serveur ou secret-bearing.
- Les Server Components peuvent lire les secrets côté serveur, mais ne doivent transmettre au client que les données strictement nécessaires.
- Les Server Actions et Route Handlers doivent authentifier, autoriser, valider et minimiser leurs réponses.
- Les secrets sont configurés dans l'environnement serveur (gestionnaire de secrets/hébergeur), jamais commités dans Git ou copiés dans des exemples réels.

## 2. Authentification et autorisation

- L'identité provient de la session authentifiée vérifiée côté serveur, jamais d'un user ID fourni par le navigateur.
- Chaque opération sensible vérifie l'appartenance active à l'entreprise, le rôle, la permission et la portée de l'enregistrement.
- Le `company_id` envoyé par le client n'est jamais une preuve d'accès.
- Les contrôles d'interface (masquer un bouton, protéger une page, désactiver une action) sont uniquement ergonomiques.
- Les autorisations sont appliquées côté serveur et renforcées par RLS PostgreSQL.
- Les opérations privilégiées utilisent des fonctions étroites, contrôlées et auditées ; aucun accès admin générique depuis le client.
- Les actions d'écriture vérifient les transitions d'état autorisées et empêchent le rejeu lorsque nécessaire.

## 3. Isolation multi-entreprises

- Toute lecture et écriture métier doit être bornée par l'entreprise autorisée.
- Utiliser des contraintes/FK composites lorsque l'intégrité inter-tenant l'exige.
- Les relations (client, fournisseur, document, ligne, paiement, etc.) doivent être vérifiées dans le même tenant.
- Tester systématiquement les accès croisés par identifiant deviné ou forgé, y compris sur les routes API et Server Actions.
- Ne jamais faire confiance à un filtre client pour assurer l'isolation.

## 4. Validation et traitement des données

- Valider côté serveur toutes les entrées avec des schémas stricts, limites de taille et listes de valeurs autorisées.
- Recalculer côté serveur les montants, remises, taxes, commissions, soldes, statuts et totaux.
- Ne jamais accepter du client un rôle, propriétaire, état validé, total calculé ou résultat d'approbation comme vérité.
- Utiliser des requêtes paramétrées et les API de données typées.
- Échapper le contenu non fiable à l'affichage. Ne pas injecter de HTML brut ; si un besoin métier l'impose, utiliser un assainisseur maintenu et testé.
- Les erreurs visibles restent génériques et utiles ; les détails internes ne sont pas renvoyés au navigateur.

## 5. Sessions, requêtes et API

- Utiliser les mécanismes de session/cookies sécurisés du framework et de Supabase SSR.
- Ne jamais stocker de jetons de session dans `localStorage`, `sessionStorage` ou IndexedDB.
- Les cookies de session doivent être HttpOnly, Secure en production et SameSite adapté.
- Pour toute mutation, appliquer les protections CSRF/origin adaptées au mécanisme Next.js et au type d'authentification ; ne pas supposer que CORS protège contre CSRF.
- Limiter les abus et tentatives sur les actions sensibles, invitations, authentification, exports et génération de liens.
- Ne jamais renvoyer une erreur SQL brute, une stack trace ou des informations d'infrastructure.

## 6. Documents et fichiers

- Le stockage des documents d'entreprise doit rester privé.
- Les autorisations de lecture/téléchargement sont revérifiées côté serveur à chaque demande.
- Les liens signés sont de courte durée, ciblés sur un objet précis et ne remplacent pas l'autorisation métier.
- Appliquer des limites de taille, types autorisés, vérification du contenu réel, noms d'objet générés côté serveur et protections contre les traversées de chemin.
- Un fichier est non fiable tant que le scanner antivirus n'a pas donné un résultat positif explicite.
- Les documents en attente, rejetés ou non analysés ne doivent pas être téléchargeables.
- Ne jamais se fier uniquement à l'extension ou au MIME envoyé par le navigateur.

## 7. Journaux et confidentialité

- Ne jamais journaliser les mots de passe, clés, jetons, cookies, contenus de documents, données de paie ou informations personnelles/financières non nécessaires.
- Masquer les identifiants sensibles et limiter les métadonnées d'audit au nécessaire.
- Les erreurs client ne doivent pas révéler les noms de tables, requêtes SQL, chemins serveur ou secrets.
- Les données personnelles et financières doivent être minimisées dans les réponses, caches, traces et outils d'analyse.

## 8. Sécurité navigateur

- Maintenir une Content Security Policy restrictive et des en-têtes HTTP de sécurité adaptés au déploiement.
- Éviter les scripts inline non nécessaires, `eval`, `dangerouslySetInnerHTML` et dépendances chargées depuis des sources non maîtrisées.
- Les source maps de production ne doivent pas être publiées si elles exposent du code ou des informations internes ; contrôler leur configuration.
- Ne pas placer de secret ou de donnée privée dans les paramètres d'URL.
- Les données sensibles ne doivent pas être mises en cache côté navigateur ou CDN sans conception et validation spécifiques.
- Vérifier les politiques de cache pour toutes les routes authentifiées et réponses personnalisées.

## 9. Tests de sécurité obligatoires

Selon le périmètre du changement, couvrir :
- utilisateur non authentifié ;
- utilisateur authentifié sans appartenance active ;
- rôle sans permission ;
- identifiant d'entreprise forgé ;
- enregistrement appartenant à une autre entreprise ;
- relation inter-tenant incohérente ;
- payload invalide, surdimensionné ou avec propriétés inattendues ;
- modification d'un état interdit ;
- tentative d'écriture directe non autorisée ;
- exposition de données sensibles dans la réponse ;
- refus de téléchargement d'un document non analysé.

Les tests positifs seuls ne suffisent pas. Les tests négatifs sont obligatoires pour les opérations protégées.

## 10. Revue des changements frontend

Pour chaque PR touchant au frontend, examiner :
- chaque ajout ou déplacement de `'use client'` ;
- chaque accès à `process.env` et chaque variable `NEXT_PUBLIC_*` ;
- chaque import Supabase, module serveur ou client privilégié ;
- chaque Server Action, Route Handler et endpoint ;
- chaque usage de `dangerouslySetInnerHTML`, `window`, stockage navigateur et console ;
- chaque export, document, lien signé, fichier et donnée personnelle ;
- chaque requête qui reçoit un `company_id`, user ID ou identifiant métier ;
- le contenu réellement envoyé au navigateur et les contrôles d'accès directs.

Pour les changements de configuration, d'accès aux données ou de frontière serveur/client, examiner le bundle de production et les réponses réseau avec des données de test non sensibles. Ne jamais utiliser de vrais secrets dans un test de bundle.

## 11. Contrôles qualité et livraison

Une interface n'est pas terminée tant que les contrôles applicables ne sont pas passés :
- lint ESLint ;
- vérification TypeScript ;
- tests unitaires et tests d'intégration ;
- tests RLS/isolation multi-entreprises ;
- build de production ;
- audit des dépendances et contrôles CI existants ;
- vérification responsive, clavier, focus, contrastes et reduced motion ;
- revue des états chargement, vide, erreur, succès et absence d'autorisation.

Ne jamais désactiver ou contourner un contrôle CI pour obtenir une validation verte. Une limitation externe de quota doit être documentée séparément d'un échec de code.

## 12. Critères bloquants

Une PR frontend est bloquée si :
- un secret serveur ou une donnée sensible fuit vers le navigateur ;
- une action sensible dépend uniquement de l'interface ;
- l'isolation tenant n'est pas vérifiée côté serveur/RLS ;
- une permission est élargie sans décision métier approuvée ;
- les montants métier sont calculés uniquement côté client ;
- une donnée non analysée est téléchargeable ;
- un test de sécurité pertinent échoue ou manque ;
- une faille connue est masquée par un changement de test ou de configuration.

## 13. Limites et responsabilité

Cette norme réduit les risques mais ne prouve pas l'absence absolue de vulnérabilité. La sécurité dépend aussi de la configuration Supabase/Vercel, des secrets d'environnement, des en-têtes réellement déployés, des politiques RLS, des dépendances, des accès opérateurs, des sauvegardes et de la surveillance. Toute affirmation de sécurité en production exige des vérifications sur l'environnement réellement déployé.

En cas de conflit, l'ordre de priorité est : cahier des charges et décisions métier approuvées, sécurité/confidentialité, autorisations/RLS, accessibilité, design system PolyGest, puis préférences visuelles du skill.
