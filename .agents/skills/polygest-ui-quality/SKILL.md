---
name: polygest-ui-quality
description: Use when reviewing, auditing or validating an existing PolyGest interface or frontend pull request for accessibility, responsive behavior, interaction quality, consistency and production readiness.
---

# PolyGest UI Quality Review

Agis comme un reviewer frontend exigeant. Cherche les défauts qui gênent réellement les utilisateurs, plutôt que de proposer des changements esthétiques sans valeur.

## Sources obligatoires

Lire :
- `docs/POLYGEST_DESIGN_SYSTEM.md` ;
- les composants concernés et leurs usages ;
- les conventions locales du dossier ;
- les tests existants associés au parcours.

## Grille de revue

### Cohérence visuelle
- Respect de la palette neutre et des tokens.
- Aucun emoji, dégradé décoratif, halo, effet néon ou animation gratuite.
- Icônes d'une seule famille et tailles cohérentes.
- Typographie et espacements hiérarchisés.
- Pas de cartes, badges ou couleurs utilisés uniquement comme décoration.

### Interactions
- Les liens sont des liens et les actions sont des boutons.
- Tous les parcours sont utilisables au clavier.
- Le focus reste visible, logique et non masqué.
- Les contrôles ont des libellés accessibles et des zones d'interaction suffisantes.
- Les actions de suppression, validation ou paiement explicitent leurs conséquences.
- Les boutons désactivés et les états de chargement expliquent clairement ce qui se passe.
- Les erreurs permettent à l'utilisateur de comprendre comment corriger le problème.

### Formulaires et données
- Les champs ont des labels persistants et les erreurs sont reliées au champ concerné.
- Les montants, devises, dates et statuts sont cohérents avec les paramètres de l'entreprise.
- Les tableaux restent lisibles avec des valeurs longues et de nombreux enregistrements.
- Les états vide, chargement, erreur, succès et absence d'autorisation sont présents.
- Aucun jeu de données ou chiffre fictif n'est présenté comme une donnée réelle.

### Responsive
- Vérifier les largeurs téléphone, tablette et desktop.
- Vérifier les formulaires, menus, modales, tableaux, filtres et barres d'action.
- Aucun débordement horizontal accidentel, action inaccessible ou texte coupé.
- Les zones tactiles sont adaptées au mobile.
- Les interactions ne dépendent pas exclusivement du survol.

### Accessibilité
- Sémantique HTML correcte.
- Contrastes visant WCAG 2.2 AA.
- Focus visible et ordre de tabulation cohérent.
- Messages asynchrones annoncés aux technologies d'assistance lorsque nécessaire.
- Respect de `prefers-reduced-motion`.
- Zoom navigateur non désactivé.

### Sécurité produit
- Les permissions ne reposent pas uniquement sur l'affichage ou le masquage d'un bouton.
- Les actions sensibles sont contrôlées côté serveur.
- L'isolation multi-entreprises repose sur les règles serveur et RLS Supabase, pas uniquement sur des filtres frontend.
- Aucun secret ou renseignement personnel n'apparaît dans le code client, les logs ou les captures.

### Qualité technique
- Pas d'erreurs TypeScript, lint ou console introduites.
- Pas de dépendance inutile.
- Pas de logique métier dupliquée dans les composants.
- Pas de régression sur navigation, états ou formulaires existants.
- Tests adaptés au risque et au comportement modifié.

## Format du retour

Classer les constatations par gravité :
1. **Bloquant** : faille d'autorisation, fuite de données, action financière incorrecte, perte de données ou parcours essentiel inutilisable.
2. **Important** : régression fonctionnelle, accessibilité sérieusement dégradée, erreur de calcul ou comportement mobile inutilisable.
3. **À corriger** : incohérence visuelle, message peu clair, interaction imprécise ou défaut responsive limité.
4. **Suggestion** : amélioration facultative sans impact immédiat.

Pour chaque constat, fournir le fichier/composant, le scénario utilisateur, le problème et une correction concrète. Ne pas inventer de défaut : mentionner explicitement les éléments non vérifiés.

Ne pas déclarer la revue réussie si les tests pertinents n'ont pas été exécutés ou si des contrôles essentiels restent inconnus.

## Référence externe

Checklist d'interaction et de qualité inspirée de [Vercel Labs Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines), adaptée au contexte et aux priorités de PolyGest.
