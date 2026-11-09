# Procès-verbal de clôture — Phase 1 PolyGest

**Date :** 9 novembre 2026  
**Dépôt :** `toussaink59-cpu/gestion-entreprise-universelle`  
**Branche de référence :** `main`  
**Commit observé pendant la clôture :** `90909d623506345c8180e64230a5cb4e0f4bb9b0`  
**Projet Supabase Production :** `ollodwinjhmqsczdtiom`  
**Projet Vercel :** `polygest`

## 1. Décision

La Phase 1 — fondation technique et multi-entreprises — est **clôturée le 9 novembre 2026** comme base technique acceptée pour poursuivre la construction du MVP PolyGest.

Cette décision clôt le chantier de fondation ; elle ne constitue pas :
- une certification fiscale ou comptable ;
- une homologation de logiciel de facturation électronique ;
- une validation de conformité juridique exhaustive dans tous les pays ;
- une déclaration que tous les modules du MVP sont terminés ;
- une autorisation d’activer les fonctionnalités documentaires ou de facturation légale encore verrouillées.

La Phase 2 est ouverte séparément. Les nouvelles fonctions restent soumises à leurs propres revues, tests, approbations et procédures de déploiement.

## 2. Éléments vérifiés à la clôture

### Code, gouvernance et CI
- La branche GitHub `main` est protégée. L’API GitHub confirme `protected=true` et les deux contrôles obligatoires : `Scripts shell — shellcheck` et `Web — lint, types, tests, build`. Le propriétaire a également confirmé avoir enregistré les options de protection recommandées dans l’interface GitHub.
- Le commit `90909d6` comprend la fusion de la PR #121 (mise à jour de la dépendance de développement Supabase CLI) et descend du commit `578733a` livré précédemment.
- Le dépôt utilise les PR et les contrôles CI comme méthode normale d’intégration. Aucun changement n’est effectué directement sur `main` dans le présent chantier documentaire.

### Production applicative
- Le déploiement Vercel Production vérifié est en état `READY`, avec l’alias `polygest.vercel.app` et sans erreur d’alias. Le déploiement vérifié correspond au commit `578733aca115c8ff68431c1c1c340077ce59e291` (PR #119). Le commit courant de `main` au moment de la clôture est plus récent ; il ne faut pas confondre ces deux références.
- Le propriétaire a confirmé le bon fonctionnement de la production et la vérification des parcours disponibles, notamment tableau de bord, clients, fournisseurs, devis, dépenses et langues française/anglaise.
- Des vérifications responsive sur mobile ont été rapportées sur l’environnement local/DEV pour les écrans principaux. Elles ne constituent pas une certification exhaustive de tous les formats et de tous les parcours en production.
- Aucune donnée de production n’a été modifiée lors des contrôles manuels mentionnés dans le suivi.

### Supabase Production
- Le projet est en état `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.003, région `eu-central-1`.
- L’historique distant comprend 18 migrations, la dernière étant `20261106102600_phase1_disable_document_upload_rpc`.
- La migration de brouillons de factures n’est pas appliquée sur Supabase Production.
- La variable Vercel `DOCUMENT_SCANNER_ENABLED` est définie à `false`. Le verrou serveur documentaire de Phase 1 demeure en place.
- Le drapeau `POLYGEST_INVOICES_ENABLED` n’est pas configuré en production ; le code exige explicitement la valeur `true`, donc le module Factures reste fermé.

### Sauvegarde et restauration
- Une sauvegarde de référence de la production avant Phase 1 et une restauration sur une base temporaire PostgreSQL 17 ont été réalisées et contrôlées.
- La variante chiffrée `.dpapi.currentuser` a été déchiffrée avec succès dans le contexte de test et son empreinte SHA-256 a correspondu à celle du dump source. Une autre variante `.dpapi` n’a pas pu être déchiffrée avec les méthodes testées ; ce constat n’a pas été interprété comme une preuve de corruption.
- Cette preuve de restauration isolée ne remplace pas une politique opérationnelle de sauvegarde continue ni des objectifs RPO/RTO formalisés.

## 3. Périmètre fonctionnel de référence

Les éléments principaux du socle sont présents et les parcours livrés ont été vérifiés selon les contrôles documentés :
- authentification, création d’entreprise et espace multi-entreprises ;
- appartenances, invitations et contrôle des rôles/permissions ;
- répertoires clients et fournisseurs ;
- devis brouillons, transmission, acceptation/refus et annulation contrôlée ;
- dépenses limitées aux brouillons ;
- préférence linguistique persistante et parcours FR/EN existants ;
- journal d’audit, tests d’isolation et contrôles RLS ;
- interface responsive pour les parcours actuellement livrés.

Le scanner antivirus et les dépôts documentaires restent fermés. Les factures ne font pas partie de la Phase 1 : leur fondation technique existante relève désormais de la Phase 2 et reste désactivée.

## 4. Risques résiduels acceptés et actions de suivi

| Sujet | État à la clôture | Règle de suivi |
|---|---|---|
| Scanner antivirus | Non intégré ; dépôt documentaire désactivé | Ne jamais ouvrir le dépôt avant intégration, tests et validation de sécurité |
| Auth — mots de passe compromis | Protection native Supabase désactivée sur l’offre Free | Réexaminer à l’évolution du plan ou dans une décision sécurité dédiée ; aucun surcoût autorisé automatiquement |
| Fonctions `SECURITY DEFINER` | Avertissements advisor sur fonctions exécutables par `authenticated` ; revue antérieure des contrôles d’accès et du `search_path` | Garder les protections actuelles ; traiter fonction par fonction, sans révocation globale |
| Tables RLS sans policy | Deux tables internes signalées par l’advisor | Confirmer qu’elles restent internes et non accessibles par les rôles API |
| Performance SQL | Clés étrangères non indexées et index signalés inutilisés | Optimiser après mesure et tests, sans migration risquée en production |
| Préproduction | Pas d’environnement de staging autonome vérifié | Tester les changements sur base jetable puis DEV ; planifier un staging séparé selon budget |
| Sauvegarde / reprise | Restauration isolée prouvée ; RPO/RTO non formalisés | Définir périodicité, rétention, stockage distinct, responsable et procédure d’incident |
| Déploiement | Production vérifiée sur `578733a`, main ensuite avancée sur `90909d6` | Vérifier le SHA de chaque déploiement ; la fusion de code ne vaut pas preuve de déploiement |

Ces réserves ne sont pas dissimulées par la clôture ; elles constituent le registre de suivi technique et sécurité.

## 5. Ouverture de la Phase 2

Le premier lot retenu est **Factures brouillons — revue, validation et livraison contrôlée en DEV**.

État de départ :
- le SQL existe dans `supabase/phase2-migrations/20261105170000_factures_brouillons.sql` ;
- la migration n’est pas présente dans l’historique hébergé Production ;
- fonctions serveur, tests et interface FR/EN existent déjà dans le dépôt ;
- les routes/actions sont protégées par `isInvoiceModuleEnabled()` et le drapeau `POLYGEST_INVOICES_ENABLED` ;
- l’activation en production est interdite pendant ce premier lot.

Critères avant toute ouverture DEV :
1. revue complète du SQL, y compris les contraintes, les fonctions privilégiées, RLS et les droits ;
2. tests sur une base jetable, base neuve et non-régression Phase 1 ;
3. migration de livraison générée avec le CLI Supabase après validation, horodatée après les migrations Phase 1 déjà appliquées ;
4. test DEV autorisé et réussi, y compris rôles, isolation multi-entreprises, scénarios positifs/négatifs et audit ;
5. contrôle FR/EN, responsive, erreurs et comportement fail-closed ;
6. production toujours désactivée et sans migration Factures jusqu’à une décision séparée.

### Hors périmètre de ce premier lot
Numérotation légale, TVA/taxes, snapshots fiscaux, émission ou certification FEC/SECeF, paiements, acomptes, factures de situation, avoirs/corrections et activation Production. Ces éléments nécessitent des validations fiscales, techniques et réglementaires distinctes.

## 6. Références
- [Audit technique Phase 1 — 6 novembre 2026](PHASE1_AUDIT_2026-11-06.md)
- [Feuille de route PolyGest](ROADMAP.md)
- [Guide des migrations Phase 2 isolées](../supabase/phase2-migrations/README.md)
- [Migration préparatoire des factures brouillons](../supabase/phase2-migrations/20261105170000_factures_brouillons.sql)
- [Spécification fonctionnelle Devis et Factures](SPECIFICATION_FONCTIONNELLE_DEVIS_FACTURES.md)
- [Référentiel de conformité fiscale — Burkina Faso](CONFORMITE_FISCALE_BURKINA_FACTURATION.md)
