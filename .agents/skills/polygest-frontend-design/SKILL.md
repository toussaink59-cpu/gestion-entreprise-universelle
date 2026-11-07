---
name: polygest-frontend-design
description: Use when designing, implementing or refactoring PolyGest user interfaces, pages, navigation, forms, dashboards, tables, design tokens or shared React components. Applies the project's neutral, professional visual identity and rejects generic AI-generated visual patterns.
---

# PolyGest Frontend Design

Agis comme un designer produit senior et un ingénieur frontend. Le résultat doit être un logiciel de gestion crédible, conçu autour de tâches métier réelles, et non une maquette décorative.

## Sources obligatoires

Avant tout travail d'interface :
1. Lire `docs/POLYGEST_DESIGN_SYSTEM.md`.
2. Examiner la page, le layout et les composants existants qui seront concernés.
3. Identifier le rôle utilisateur, l'objectif de la page, l'action principale et les données réellement disponibles.
4. Lire les conventions du code dans le dossier concerné.

Les exigences métier, de sécurité et de confidentialité du dépôt priment sur ce skill.

## Direction visuelle

- Utiliser la palette neutre et les tokens définis dans le design system.
- Garder les écrans principalement blancs, gris très clair et anthracite ; l'accent bleu nuit (orange de marque limité aux repères non textuels) est rare et fonctionnel.
- Ne jamais ajouter d'emoji dans les écrans.
- Éviter les dégradés, néons, halos, lueurs, illustrations arbitraires, effets verre, arrière-plans colorés décoratifs, gros titres marketing inutiles et animations d'apparat.
- Ne pas reproduire le modèle générique « toutes les informations dans des cartes arrondies identiques ».
- Ne pas ajouter de mini-étiquettes en capitales au-dessus de chaque titre ni de micro-textes décoratifs.
- Ne pas utiliser des couleurs différentes simplement pour donner une identité à chaque module.
- Ne pas inventer de statistiques, montants, tendances ou noms de clients.

Un écran peut être visuellement distinctif par sa hiérarchie, son rythme, son alignement et son organisation des données ; il n'a pas besoin d'effets décoratifs.

## Processus de conception

### 1. Définir l'intention
Écrire mentalement ou dans la PR une phrase qui décrit :
- qui utilise l'écran ;
- la tâche qu'il cherche à effectuer ;
- les informations indispensables ;
- le résultat attendu.

### 2. Définir la structure
Choisir la structure adaptée à la tâche :
- tableau pour parcourir et comparer des enregistrements ;
- formulaire pour saisir ou modifier une entité ;
- résumé compact pour mettre en évidence quelques indicateurs utiles ;
- chronologie pour représenter un historique ;
- liste pour des éléments consultés ou traités individuellement.

Ne pas convertir chaque groupe de données en carte par défaut.

### 3. Concevoir les états
Pour chaque vue, examiner les états :
- initial ou sans donnée ;
- chargement ;
- résultat normal ;
- erreur réseau ou serveur ;
- validation invalide ;
- accès refusé ;
- action réussie ;
- action annulée ou confirmation nécessaire.

Le texte de ces états doit être utile et précis. Ne pas utiliser d'illustration ou d'emoji pour compenser un état vide.

### 4. Implémenter
- Réutiliser d'abord les composants et tokens en place.
- Préférer les Server Components Next.js ; utiliser les Client Components uniquement si la fonctionnalité exige une interaction côté navigateur.
- Garder les composants simples, typés et proches de leur domaine.
- Ne pas ajouter une bibliothèque UI, animation ou icônes sans vérifier ce qui est déjà installé et justifier le besoin.
- Garder les liens comme des liens, les actions comme des boutons et les champs associés à de vrais libellés.
- Préserver les comportements natifs du navigateur et la navigation clavier.
- Ne pas déplacer une règle métier dans le composant pour la rendre plus facile à afficher.

### 5. Critiquer avant livraison
Se demander :
- Cette page pourrait-elle appartenir à n'importe quel SaaS généré par IA ? Si oui, retirer les motifs génériques et l'ancrer davantage dans la tâche métier.
- Chaque couleur, icône, bordure, ombre et animation a-t-elle un rôle ?
- L'information principale est-elle repérable immédiatement ?
- Le parcours est-il plus simple qu'avant ?
- La page reste-t-elle claire avec des données longues, absentes ou nombreuses ?
- L'écran reste-t-il utilisable sur mobile et au clavier ?

Corriger les problèmes évidents avant de livrer.

## Livrable attendu

Pour un changement frontend significatif, décrire dans le résumé de PR :
- le problème utilisateur traité ;
- la structure retenue ;
- les états ajoutés ou modifiés ;
- les contrôles d'accessibilité et responsive réalisés ;
- les tests exécutés et les limites restantes.

## Référence externe

Méthode de conception inspirée du skill [Anthropic Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design), adaptée spécifiquement à PolyGest. Ne pas recopier aveuglément ses choix visuels : le design system PolyGest est la source de vérité.
