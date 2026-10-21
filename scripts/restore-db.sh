#!/bin/bash
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ]; then
    echo "Erreur: DATABASE_URL non définie."
    exit 1
fi
if [ -z "${1:-}" ]; then
    echo "Usage: ./scripts/restore-db.sh <fichier_backup.sql>"
    exit 1
fi
BACKUP_FILE=$1
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Erreur: Le fichier $BACKUP_FILE n'existe pas."
    exit 1
fi
echo "Restauration en cours depuis $BACKUP_FILE..."
psql "$DATABASE_URL" --no-password -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"
echo "Restauration terminée."
