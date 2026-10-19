# Contribuer au projet

Le projet est actuellement au stade de la spécification. Les contributions doivent aider à clarifier les besoins, le modèle de données, la sécurité et le périmètre du MVP avant d’accélérer le développement.

## Avant de proposer une modification

1. Vérifier les documents existants et éviter de dupliquer les exigences.
2. Décrire le besoin métier, le profil utilisateur concerné et le résultat attendu.
3. Indiquer les impacts sur les données, les permissions, les calculs financiers et la conformité.
4. Pour une fonctionnalité, définir au moins un critère d’acceptation vérifiable.
5. N’ajouter aucun secret, identifiant réel, document client ou donnée de paie dans le dépôt.

## Workflow proposé

- Une branche par fonctionnalité ou correction.
- Des commits courts et descriptifs.
- Une pull request avec contexte, changements et tests exécutés.
- Une revue spécifique pour les changements touchant la paie, les finances, les droits d’accès ou la structure des données.
- Les migrations de base de données doivent être versionnées et accompagnées de tests.

## Style documentaire

Rédiger en français dans un langage clair. Définir les termes métier et séparer les exigences obligatoires des propositions. Ne pas annoncer une fonctionnalité comme opérationnelle tant qu’elle n’est pas implémentée et testée.
