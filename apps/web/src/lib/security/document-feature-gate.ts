/**
 * Verrou temporaire Phase 1.
 *
 * Aucun scanner antivirus serveur n'est intégré : une variable d'environnement
 * ne doit donc jamais suffire à ouvrir les dépôts ou téléchargements.
 * Pour réactiver le module, remplacer explicitement ce verrou après livraison
 * et tests du scanner, du nettoyage et de la quarantaine.
 */
export function isDocumentFeatureEnabled(): boolean {
  return false;
}
