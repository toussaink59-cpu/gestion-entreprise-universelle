#!/bin/bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
    echo "Erreur : DATABASE_URL non définie." >&2
    exit 1
fi
if [ -z "${1:-}" ]; then
    echo "Usage: ./scripts/restore-db.sh <fichier_backup.sql>" >&2
    exit 1
fi

BACKUP_FILE=$1
if [ ! -s "$BACKUP_FILE" ]; then
    echo "Erreur : le fichier de sauvegarde est absent ou vide." >&2
    exit 1
fi

# Une restauration SQL pg_dump est prévue pour une base cible vierge.
# Refuser les objets applicatifs préexistants évite une restauration partielle
# sur une base déjà utilisée. Le script ne supprime et ne vide jamais la cible.
TARGET_OBJECTS="$(psql "$DATABASE_URL" --no-password -v ON_ERROR_STOP=1 -Atqc "
    select
      (select count(*)
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname not in ('pg_catalog', 'information_schema')
         and n.nspname not like 'pg_%'
         and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f'))
      +
      (select count(*)
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname not in ('pg_catalog', 'information_schema')
         and n.nspname not like 'pg_%')
      +
      (select count(*)
       from pg_namespace
       where nspname not in ('pg_catalog', 'information_schema', 'public')
         and nspname not like 'pg_%');
")"

if [[ ! "$TARGET_OBJECTS" =~ ^[0-9]+$ ]]; then
    echo "Erreur : impossible de vérifier le contenu de la base cible." >&2
    exit 1
fi
if [ "$TARGET_OBJECTS" -ne 0 ]; then
    echo "Erreur : la base cible n'est pas vide ($TARGET_OBJECTS objets applicatifs détectés)." >&2
    echo "Choisis une base vierge avant de restaurer. Aucune donnée n'a été modifiée." >&2
    exit 1
fi

echo "Restauration en cours depuis $BACKUP_FILE..."
psql "$DATABASE_URL" --no-password -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"
echo "Restauration terminée."
