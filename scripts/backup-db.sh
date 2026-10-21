#!/usr/bin/env bash
set -euo pipefail

# Les sauvegardes contiennent potentiellement des données confidentielles.
umask 077

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Erreur : DATABASE_URL non définie." >&2
    exit 1
fi

BACKUP_DIR="./backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="$BACKUP_DIR/backup_gestion_db_${TIMESTAMP}_$$.sql"

mkdir -p "$BACKUP_DIR"
# Protège aussi un dossier préexistant, pas seulement un dossier nouvellement créé.
chmod 700 "$BACKUP_DIR"

# Écrit d'abord dans un fichier temporaire pour ne jamais exposer une sauvegarde
# partielle sous son nom définitif. Le trap nettoie le temporaire en cas d'échec.
TEMP_FILE="$(mktemp "$BACKUP_DIR/.backup_gestion_db_${TIMESTAMP}_$$.XXXXXX.tmp")"
cleanup() {
    rm -f "$TEMP_FILE"
}
trap cleanup EXIT

echo "Sauvegarde en cours..."
if ! pg_dump "$DATABASE_URL" --no-password > "$TEMP_FILE"; then
    echo "Erreur : la sauvegarde a échoué." >&2
    exit 1
fi

if [[ ! -s "$TEMP_FILE" ]]; then
    echo "Erreur : pg_dump a produit une sauvegarde vide." >&2
    exit 1
fi

mv -- "$TEMP_FILE" "$BACKUP_FILE"
trap - EXIT
chmod 600 "$BACKUP_FILE"
echo "Sauvegarde terminée : $BACKUP_FILE"
