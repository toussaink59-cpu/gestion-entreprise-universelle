# Sécurité et signalement des vulnérabilités

Le projet est en phase de cadrage. Aucune donnée réelle d’entreprise, de client ou de paie ne doit être utilisée tant que les contrôles de sécurité et les procédures d’exploitation n’ont pas été validés.

## Principes requis

- Isolation vérifiée entre entreprises, y compris pour les exports et les documents.
- Droits d’accès minimaux par rôle et séparation des fonctions sensibles.
- Authentification fiable, gestion des sessions et procédure de révocation.
- Validation serveur des entrées et protection contre les abus.
- Aucun secret ou identifiant sensible dans le dépôt Git.
- Journalisation des actions sensibles sans consigner de secrets.
- Sauvegardes régulières et exercices de restauration.
- Dépendances maintenues, contrôles automatisés et revue avant déploiement.
- Données fictives ou anonymisées dans les environnements non productifs.

## Signalement

Jusqu’à la mise en place d’une adresse de sécurité dédiée, ne publiez pas de détails exploitables sur une vulnérabilité dans une issue publique. Contactez le mainteneur du dépôt par un canal privé disponible sur son profil GitHub. Incluez les étapes de reproduction, l’impact observé et un moyen de reproduire le problème avec des données fictives. N’incluez pas de données personnelles réelles.

## Mise en production

Une mise en production exige une revue de sécurité, des tests d’autorisation multi-entreprises, une vérification des dépendances, un plan de sauvegarde/restauration et des responsabilités d’intervention documentées.
