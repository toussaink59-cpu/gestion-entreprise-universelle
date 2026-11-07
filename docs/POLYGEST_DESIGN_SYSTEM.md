# PolyGest — Design system

**Statut :** référence initiale à appliquer aux nouvelles interfaces et aux refontes.  
**Produit :** logiciel de gestion multi-entreprises pour entrepreneurs, indépendants, TPE et PME.  
**Priorité :** lisibilité, fiabilité, cohérence et efficacité des tâches quotidiennes.

Ce document définit une direction visuelle volontairement sobre. Il doit guider les décisions d'interface sans imposer de refaire toutes les pages existantes d'un seul coup.

## 1. Direction artistique

PolyGest doit évoquer un outil de travail fiable, calme et professionnel. Il ne doit pas ressembler à une démonstration de design, à un tableau de bord de jeu vidéo ou à une interface générique assemblée par une IA.

Principes :
- **Fonction avant décoration :** chaque élément visible doit aider à comprendre, décider ou agir.
- **Neutralité maîtrisée :** les surfaces et la typographie portent l'interface ; la couleur reste rare et fonctionnelle.
- **Densité utile :** présenter les informations de gestion de façon compacte mais respirante. Ne pas transformer chaque donnée en carte.
- **Hiérarchie stable :** mêmes conventions pour titres, actions, filtres, tableaux, statuts et formulaires.
- **Confiance :** afficher clairement les montants, dates, statuts, confirmations et conséquences d'une action.
- **Adaptation :** interface responsive, utilisable au clavier et sur écran tactile.

## 2. Palette de couleurs

La palette par défaut est claire, neutre et faiblement saturée. Les valeurs ci-dessous sont des tokens de départ ; toute évolution doit rester cohérente et être documentée ici.

| Token | Valeur | Usage |
|---|---|---|
| `--pg-canvas` | `#F5F6F7` | Fond général de l'application |
| `--pg-surface` | `#FFFFFF` | Panneaux, menus, formulaires et tableaux |
| `--pg-surface-subtle` | `#F0F2F4` | Survols et zones secondaires |
| `--pg-text` | `#20262D` | Texte principal |
| `--pg-text-muted` | `#58636F` | Texte secondaire et aide |
| `--pg-border` | `#D5DCE3` | Séparateurs et bordures discrètes |
| `--pg-control-border` | `#7A8794` | Bordures de champs et contrôles (3,7:1 sur blanc ; l'ancienne valeur `#8B98A5` n'atteignait pas 3:1) |
| `--pg-accent` | `#0F2A6B` | Action principale, lien important, sélection (bleu nuit du logo éclairci ; contraste 13,4:1 sur blanc) |
| `--pg-accent-hover` | `#0A1F52` | Survol de l'accent |
| `--pg-focus` | `#2F55B0` | Anneau de focus visible (6,9:1 sur blanc) |
| `--pg-brand` | `#FF7200` | Orange du logo officiel : repère de marque non textuel uniquement |

**Règle de l'orange de marque.** L'orange `#FF7200` n'offre que 2,7:1 sur blanc : il ne sert **jamais** de couleur de texte, de lien, de bouton ni de statut. Il est réservé au logo et à de petits repères non textuels déjà doublés d'un autre signal (par exemple le trait de l'élément de navigation actif, qui est aussi signalé par `aria-current`, le fond et le texte). Le texte posé sur orange est le bleu nuit `#01123B` (6,7:1). Le bleu nuit du logo (`#01123B`) reste celui du fichier du logo ; l'accent de l'interface est volontairement plus clair pour se distinguer du texte principal.

### Couleurs sémantiques

Les couleurs de statut doivent rester atténuées et toujours être accompagnées d'un libellé ou d'une icône significative. Ne jamais transmettre une information uniquement par la couleur.

| État | Texte | Fond discret | Usage |
|---|---|---|---|
| Succès | `#285C45` | `#EEF5F0` | Action terminée, paiement confirmé |
| Attention | `#76571F` | `#F8F4EA` | Échéance proche, action à vérifier |
| Erreur | `#963F3F` | `#FAF0F0` | Échec, blocage ou donnée invalide |
| Information | `#0F2A6B` | `#EEF2F6` | Information neutre |

Ne pas ajouter une couleur de marque supplémentaire à chaque module. Le module courant se distingue d'abord par la navigation, le titre et la structure, pas par un code couleur arbitraire.

## 3. Typographie

- Utiliser **Geist Sans**, déjà chargée dans le layout de l'application, pour l'interface.
- Réserver **Geist Mono** aux références, identifiants techniques et données qui bénéficient réellement d'un alignement monospace.
- Ne pas introduire une seconde police sans raison de conception et validation.
- Échelle indicative : 12 px pour les aides discrètes, 14 px pour les données secondaires, 16 px pour le texte courant et les champs, 20 px pour les titres de section, 24 à 28 px pour le titre de page.
- Utiliser une hiérarchie par taille, graisse et espacement. Éviter le texte en capitales systématique, le tracking exagéré et les titres décoratifs.
- Conserver des paragraphes courts et des libellés explicites. Ne pas diminuer la taille du texte pour faire entrer artificiellement plus de données.

## 4. Espacement, formes et profondeur

Échelle d'espacement de référence : **4, 8, 12, 16, 24, 32, 48 et 64 px**.

- Préférer des alignements nets et une grille cohérente.
- Utiliser des rayons modestes, généralement 4 à 8 px. Les composants appartenant à un même groupe peuvent partager un rayon.
- Réserver les ombres aux éléments qui se détachent réellement du flux : menu, popover ou dialogue. Les panneaux ordinaires utilisent plutôt une bordure discrète.
- Ne pas entourer chaque bloc de données d'une carte. Une page peut combiner titres, sections, séparateurs, tableaux et espaces blancs.
- Éviter les couches de panneaux imbriqués et les grandes surfaces colorées sans rôle fonctionnel.

## 5. Navigation et structure des pages

- La navigation doit rester stable entre les modules : emplacement, libellés et comportement prévisibles.
- Utiliser des intitulés métier compréhensibles en français.
- Le titre de page indique clairement où l'utilisateur se trouve ; le sous-titre n'est présent que s'il apporte un contexte utile.
- Placer les actions principales à un endroit cohérent et visible. Les actions secondaires ne doivent pas rivaliser avec l'action principale.
- Les filtres, recherches, tris et paginations doivent être proches des données qu'ils contrôlent.
- Sur mobile, prioriser la tâche courante et éviter les tableaux qui débordent sans alternative exploitable.

## 6. Tableaux et données de gestion

Les tableaux sont un composant central de PolyGest. Les privilégier lorsqu'ils permettent de comparer ou parcourir plusieurs enregistrements.

- En-têtes explicites, alignement cohérent et colonnes dimensionnées selon leur contenu.
- Aligner les montants à droite ; utiliser un formatage monétaire cohérent.
- Afficher les dates et statuts dans des formats constants.
- Prévoir recherche, filtre, tri, pagination et sélection uniquement lorsque le volume et le parcours le justifient.
- Les actions sur une ligne doivent être compréhensibles, accessibles au clavier et ne pas être cachées derrière un contrôle ambigu.
- Sur mobile, proposer une adaptation documentée : colonnes prioritaires, liste structurée ou défilement horizontal clairement signalé.
- Ne jamais inventer de données de démonstration dans une vue connectée à l'environnement réel.

## 7. Formulaires et opérations sensibles

- Un champ possède un libellé persistant, une aide si nécessaire et un message de validation associé.
- Regrouper les champs selon le parcours métier, pas selon leur type technique.
- Distinguer les champs obligatoires des champs facultatifs.
- Conserver les valeurs saisies après une erreur lorsque c'est possible et sûr.
- Afficher le montant, la devise, les taxes, les échéances et le statut avec une précision adaptée au contexte.
- Les actions irréversibles ou financières sensibles nécessitent une confirmation qui décrit la conséquence ; ne pas utiliser une boîte de dialogue générique.
- Ne pas utiliser de couleur seule pour indiquer une erreur ou un succès.

## 8. Icônes, illustrations et médias

- **Aucun emoji dans l'interface PolyGest.** Cela concerne les menus, boutons, titres, statuts, notifications, tableaux et états vides.
- Utiliser une bibliothèque d'icônes unique déjà installée dans le projet. Si aucune bibliothèque n'est disponible, choisir une solution SVG accessible et cohérente avant d'ajouter une dépendance.
- Garder une taille, une épaisseur de trait et un alignement constants.
- Une icône sans libellé doit avoir un nom accessible et, si nécessaire, une infobulle.
- Ne pas ajouter d'illustrations générées, d'avatars décoratifs ou d'images de stock dans les écrans métiers sans besoin explicite.

## 9. Mouvement et feedback

- Les animations sont rares, courtes et liées à une action de l'utilisateur : ouverture, fermeture, sélection ou confirmation.
- Respecter `prefers-reduced-motion`.
- Éviter les animations automatiques à l'entrée de chaque bloc, les effets de parallaxe et les transitions décoratives.
- Les états de chargement doivent éviter le scintillement et garder le contexte de l'action.
- Les notifications doivent être concises, explicites et annoncées aux technologies d'assistance si elles sont asynchrones.

## 10. Responsive et accessibilité

- Concevoir les écrans pour ordinateur, tablette et smartphone ; ne pas réduire simplement la largeur d'une page desktop.
- Prévoir des zones tactiles d'au moins 44 × 44 px sur mobile.
- Garder une taille de police d'au moins 16 px pour les champs de saisie sur mobile.
- Tout parcours doit être utilisable au clavier ; le focus visible ne doit jamais être masqué.
- Respecter la sémantique HTML et les rôles ARIA uniquement lorsqu'ils sont nécessaires.
- Viser le niveau WCAG 2.2 AA pour les contrastes et interactions.
- Ne jamais désactiver le zoom navigateur.
- Tester les états de focus, erreur, désactivé, chargement, vide et succès.

## 11. Données, langues et formats

- L'interface est rédigée en français par défaut, avec des libellés métier simples et constants.
- Utiliser les mécanismes de formatage localisés, notamment `Intl.NumberFormat` et `Intl.DateTimeFormat`, selon les paramètres disponibles de l'entreprise et de l'utilisateur.
- Ne pas coder en dur une devise, un fuseau horaire ou un format de date dans les calculs métier.
- Le Burkina Faso est le marché de départ, mais les choix visuels et les composants doivent rester extensibles à d'autres pays.
- Une donnée inconnue doit être indiquée comme indisponible ou non renseignée, jamais remplacée par un chiffre fictif.

## 12. Contrôle avant livraison

Avant de considérer une interface terminée, vérifier :
- [ ] Aucun emoji ni décoration évoquant une interface générée automatiquement.
- [ ] Palette neutre et accent limité aux usages fonctionnels.
- [ ] Typographie, espacements, bordures et icônes cohérents.
- [ ] Aucun tableau, formulaire ou menu difficile à utiliser au clavier.
- [ ] Contrastes, focus, libellés et messages accessibles.
- [ ] États chargement, vide, erreur, succès et absence d'autorisation traités.
- [ ] Comportement mobile vérifié.
- [ ] Aucune donnée fictive présentée comme réelle.
- [ ] Aucune autorisation ou règle métier reposant uniquement sur l'interface.
- [ ] Lint, TypeScript, tests et build exécutés selon le périmètre du changement.

## Références de méthode

Ces ressources inspirent la méthode, sans remplacer les règles spécifiques de PolyGest :
- [Anthropic — Frontend Design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
- [Vercel Labs — Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)

En cas de différence, ce document et les exigences métier/sécurité de PolyGest priment sur les exemples génériques des ressources externes.
