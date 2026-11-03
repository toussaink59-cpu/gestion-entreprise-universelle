# Instructions pour les agents de développement

Ces règles s'appliquent à l'ensemble du dépôt. Les instructions plus précises d'un sous-dossier peuvent les compléter, mais ne doivent pas affaiblir les exigences de sécurité du projet.

## Avant toute intervention frontend

Lire :
1. `docs/POLYGEST_DESIGN_SYSTEM.md` ;
2. `.agents/skills/polygest-frontend-design/SKILL.md` pour concevoir ou modifier une interface ;
3. `.agents/skills/polygest-ui-quality/SKILL.md` pour auditer une interface ou préparer une revue.

Appliquer ces règles aux pages, composants, formulaires, tableaux, graphiques, menus, états vides, chargements, erreurs et notifications.

## Identité visuelle obligatoire

- PolyGest est un logiciel de gestion d'entreprise : l'interface doit être sobre, lisible, dense quand les données l'exigent et prévisible.
- Ne pas utiliser d'emojis dans l'interface produit.
- Ne pas produire l'apparence typique d'une interface générée par IA : pas de dégradés décoratifs, halos, lueurs, fonds multicolores, titres artificiellement spectaculaires, grilles de cartes répétitives ou animations gratuites.
- Partir d'une palette neutre. Réserver l'accent de marque aux actions principales et aux états interactifs utiles. Les couleurs sémantiques servent uniquement à communiquer un état réel.
- Utiliser une seule famille d'icônes cohérente déjà présente dans le projet. Ne pas mélanger emojis, pictogrammes Unicode et bibliothèques d'icônes.
- Ne pas ajouter une dépendance frontend pour une simple préférence esthétique sans justification.
- Ne pas inventer de statistiques, de données financières, d'avis, de clients ou de contenu présenté comme réel.

## Développement

- Respecter la structure, les conventions et les composants existants avant d'en créer de nouveaux.
- Utiliser TypeScript avec des types explicites et des composants React accessibles.
- Dans Next.js, préférer les Server Components ; ajouter `"use client"` uniquement lorsqu'une interaction ou une API du navigateur l'exige.
- Réutiliser les composants et tokens existants. Éviter les abstractions prématurées et les composants qui ne servent qu'une seule fois sans bénéfice clair.
- Concevoir les formulaires, tableaux et parcours selon le véritable besoin métier, pas uniquement pour remplir l'écran.
- Les états de chargement, vide, erreur, succès, validation et absence d'autorisation doivent être traités explicitement.
- Respecter le fonctionnement mobile, clavier, lecteur d'écran et zoom navigateur.

## Sécurité et règles métier

- L'interface ne remplace jamais l'autorisation côté serveur ni les politiques RLS Supabase.
- Toute donnée doit rester isolée par entreprise. Ne jamais se fier uniquement à un filtre client ou à un élément masqué dans l'interface.
- Toute opération financière doit respecter les règles métier, les permissions, la traçabilité et les validations serveur déjà établies.
- Ne pas modifier une migration, un rôle, une permission, une règle financière ou un mécanisme d'authentification dans le cadre d'un simple travail visuel sans l'indiquer et le tester.
- Ne pas exposer de secrets, de données personnelles ou de données financières réelles dans les exemples, captures, journaux ou tests.

## Workflow

- Travailler sur une branche dédiée, jamais directement sur `main`.
- Avant de coder, examiner le parcours existant et les composants réutilisables.
- Pour une fonctionnalité importante, définir les critères d'acceptation et les états d'interface avant l'implémentation.
- Exécuter les contrôles pertinents : lint, vérification TypeScript, tests et build.
- Résumer les fichiers modifiés, les contrôles exécutés et les limites connues dans la Pull Request.
- Ne pas déclarer une fonctionnalité prête pour la production sans validation fonctionnelle, sécurité, hébergement et exploitation.
