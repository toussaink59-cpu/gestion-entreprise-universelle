#!/bin/bash
# Test de sauvegarde / restauration de bout en bout (ACC-07, SEC-06).
#
# 1. crée une base source jetable : migrations + données fictives ;
# 2. la sauvegarde avec scripts/backup-db.sh ;
# 3. la restaure dans une base vierge avec scripts/restore-db.sh ;
# 4. compare données et structure, puis vérifie que l'isolation tient sur la base restaurée.
#
# Usage : ADMIN_URL=postgresql://utilisateur:motdepasse@hote:5432/postgres ./scripts/test-restore.sh
# ADMIN_URL doit désigner un superutilisateur sur une base de maintenance, sans paramètres
# d'URL après le nom de la base. Utiliser uniquement un serveur JETABLE (jamais la production) :
# le script crée puis supprime deux bases.
set -euo pipefail

if [ -z "${ADMIN_URL:-}" ]; then
    echo "Erreur: ADMIN_URL non définie." >&2
    exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${ADMIN_URL%/*}"
SUFFIX="$$"
SRC_DB="restore_src_${SUFFIX}"
DST_DB="restore_dst_${SUFFIX}"
SRC_URL="${BASE_URL}/${SRC_DB}"
DST_URL="${BASE_URL}/${DST_DB}"
WORKDIR="$(mktemp -d)"
ALICE="00000000-0000-4000-8000-00000000000a"
BOB="00000000-0000-4000-8000-00000000000b"

cleanup() {
    psql "$ADMIN_URL" -q -c "drop database if exists ${SRC_DB} with (force)" >/dev/null 2>&1 || true
    psql "$ADMIN_URL" -q -c "drop database if exists ${DST_DB} with (force)" >/dev/null 2>&1 || true
    rm -rf "$WORKDIR"
}
trap cleanup EXIT

run_sql() { psql "$1" -v ON_ERROR_STOP=1 -q -tA "${@:2}"; }

echo "1/5 Création de la base source (migrations + données fictives)"
run_sql "$ADMIN_URL" -c "create database ${SRC_DB}" >/dev/null
run_sql "$SRC_URL" -f "$ROOT/supabase/tests/auth_shim.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do
    run_sql "$SRC_URL" -f "$f" >/dev/null
done
run_sql "$SRC_URL" -f "$ROOT/supabase/tests/seed_restore.sql" >/dev/null

echo "2/5 Sauvegarde (scripts/backup-db.sh)"
START=$SECONDS
(cd "$WORKDIR" && DATABASE_URL="$SRC_URL" "$ROOT/scripts/backup-db.sh")
BACKUP_FILE="$(ls "$WORKDIR"/backups/*.sql)"

echo "3/5 Restauration dans une base vierge (scripts/restore-db.sh)"
run_sql "$ADMIN_URL" -c "create database ${DST_DB}" >/dev/null
DATABASE_URL="$DST_URL" "$ROOT/scripts/restore-db.sh" "$BACKUP_FILE" >/dev/null
echo "    durée sauvegarde + restauration : $((SECONDS - START)) s"

echo "4/5 Comparaison des données et de la structure"
fingerprint() {
    local url="$1" tables t
    tables="$(run_sql "$url" -c "select schemaname || '.' || tablename from pg_tables
                                 where schemaname in ('public', 'auth') order by 1")"
    for t in $tables; do
        run_sql "$url" -c "select '$t', count(*), md5(coalesce(string_agg(x::text, E'\n' order by x::text), ''))
                           from $t x"
    done
    run_sql "$url" -c "select 'rls_tables', count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                       where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity"
    run_sql "$url" -c "select 'policies', count(*) from pg_policies where schemaname = 'public'"
    run_sql "$url" -c "select 'triggers', count(*) from pg_trigger where not tgisinternal"
    run_sql "$url" -c "select 'app_functions', count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                       where n.nspname = 'app'"
}
fingerprint "$SRC_URL" > "$WORKDIR/src.txt"
fingerprint "$DST_URL" > "$WORKDIR/dst.txt"
if ! diff -u "$WORKDIR/src.txt" "$WORKDIR/dst.txt"; then
    echo "ÉCHEC: la base restaurée diffère de la base source." >&2
    exit 1
fi
ROWS="$(awk -F'|' '$1 ~ /^public\./ {s += $2} END {print s}' "$WORKDIR/src.txt")"
if [ "${ROWS:-0}" -lt 10 ]; then
    echo "ÉCHEC: base source quasi vide (${ROWS:-0} lignes) : le test ne prouverait rien." >&2
    exit 1
fi
echo "    ${ROWS} lignes comparées dans le schéma public : identiques"

echo "5/5 Isolation sur la base restaurée (ACC-01 après restauration)"
VISIBLE="$(run_sql "$DST_URL" -c "set role authenticated" \
    -c "select set_config('request.jwt.claim.sub', '$ALICE', false)" \
    -c "select count(*) from public.companies" | tail -n 1)"
if [ "$VISIBLE" != "1" ]; then
    echo "ÉCHEC: Alice voit ${VISIBLE} entreprise(s) après restauration (attendu : 1)." >&2
    exit 1
fi
COMPANY_A="$(run_sql "$DST_URL" -c "select id from public.companies where legal_name like 'Entreprise A%'")"
OTHER="$(run_sql "$DST_URL" -c "set role authenticated" \
    -c "select set_config('request.jwt.claim.sub', '$BOB', false)" \
    -c "select count(*) from public.audit_events where company_id = '$COMPANY_A'" | tail -n 1)"
if [ "$OTHER" != "0" ]; then
    echo "ÉCHEC: Bob lit ${OTHER} événement(s) d'audit de l'entreprise A." >&2
    exit 1
fi
OWN="$(run_sql "$DST_URL" -c "set role authenticated" \
    -c "select set_config('request.jwt.claim.sub', '$BOB', false)" \
    -c "select count(*) from public.audit_events" | tail -n 1)"
if [ "$OWN" -lt 1 ]; then
    echo "ÉCHEC: Bob ne lit pas le journal de sa propre entreprise après restauration." >&2
    exit 1
fi

echo "OK: sauvegarde, restauration et isolation vérifiées."
