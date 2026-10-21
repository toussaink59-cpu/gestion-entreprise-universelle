#!/bin/bash
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ]; then
    echo "Erreur: DATABASE_URL non définie."
    exit 1
fi
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_gestion_db_$TIMESTAMP.sql"
mkdir -p "$BACKUP_DIR"
echo "Sauvegarde en cours..."
pg_dump "$DATABASE_URL" --no-password > "$BACKUP_FILE" || { rm -f "$BACKUP_FILE"; echo "Erreur: la sauvegarde a échoué."; exit 1; }
echo "Sauvegarde terminée : $BACKUP_FILE"
