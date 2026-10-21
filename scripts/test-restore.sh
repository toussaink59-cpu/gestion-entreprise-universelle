#!/usr/bin/env bash
# Test de sauvegarde / restauration de bout en bout (ACC-07, SEC-06).
#
# 1. crée une base source jetable : migrations + données fictives ;
# 2. la sauvegarde avec scripts/backup-db.sh ;
# 3. la restaure dans une base vierge avec scripts/restore-db.sh ;
# 4. compare les données et les définitions de structure/sécurité ;
# 5. vérifie l'isolation sur la base restaurée.
#
# Usage : ADMIN_URL=postgresql://utilisateur:motdepasse@hote:5432/postgres ./scripts/test-restore.sh
# ADMIN_URL doit désigner un superutilisateur sur une base de maintenance, sans paramètres
# d'URL après le nom de la base. Utiliser uniquement un serveur JETABLE (jamais la production) :
# le script crée puis supprime deux bases.
set -euo pipefail

if [[ -z "${ADMIN_URL:-}" ]]; then
    echo "Erreur : ADMIN_URL non définie." >&2
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
BACKUP_FILE="$(find "$WORKDIR/backups" -maxdepth 1 -type f -name '*.sql' -print -quit)"
if [[ -z "$BACKUP_FILE" || ! -s "$BACKUP_FILE" ]]; then
    echo "ÉCHEC : aucun fichier de sauvegarde exploitable n'a été créé." >&2
    exit 1
fi

echo "3/5 Restauration dans une base vierge (scripts/restore-db.sh)"
run_sql "$ADMIN_URL" -c "create database ${DST_DB}" >/dev/null
DATABASE_URL="$DST_URL" "$ROOT/scripts/restore-db.sh" "$BACKUP_FILE" >/dev/null
echo "    durée sauvegarde + restauration : $((SECONDS - START)) s"

echo "4/5 Comparaison des données et des définitions de structure/sécurité"
fingerprint() {
    local url="$1" tables t
    tables="$(run_sql "$url" -c "select schemaname || '.' || tablename from pg_tables
                                 where schemaname in ('public', 'auth') order by 1")"
    for t in $tables; do
        run_sql "$url" -c "select 'rows', '$t', count(*),
                            md5(coalesce(string_agg(x::text, E'\n' order by x::text), ''))
                            from $t x"
    done

    # Colonnes : type, ordre, nullabilité et valeur par défaut.
    run_sql "$url" -c "select 'column', n.nspname, c.relname, a.attnum, a.attname,
                               format_type(a.atttypid, a.atttypmod), a.attnotnull, a.attidentity, a.attgenerated,
                               coalesce(pg_get_expr(d.adbin, d.adrelid), '')
                        from pg_attribute a
                        join pg_class c on c.oid = a.attrelid
                        join pg_namespace n on n.oid = c.relnamespace
                        left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
                        where n.nspname in ('public', 'auth')
                          and c.relkind in ('r', 'p')
                          and a.attnum > 0 and not a.attisdropped
                        order by n.nspname, c.relname, a.attnum"

    # Contraintes et indexes : les comptes seuls ne détectent pas une définition modifiée.
    run_sql "$url" -c "select 'constraint', n.nspname, c.relname, con.conname, con.contype,
                               pg_get_constraintdef(con.oid, true)
                        from pg_constraint con
                        join pg_class c on c.oid = con.conrelid
                        join pg_namespace n on n.oid = c.relnamespace
                        where n.nspname in ('public', 'auth')
                        order by n.nspname, c.relname, con.conname"
    run_sql "$url" -c "select 'index', schemaname, tablename, indexname, indexdef
                        from pg_indexes where schemaname in ('public', 'auth')
                        order by schemaname, tablename, indexname"

    # RLS et définitions exactes des politiques.
    run_sql "$url" -c "select 'rls', n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
                        from pg_class c join pg_namespace n on n.oid = c.relnamespace
                        where n.nspname in ('public', 'auth') and c.relkind in ('r', 'p')
                        order by n.nspname, c.relname"
    run_sql "$url" -c "select 'policy', schemaname, tablename, policyname, permissive,
                               roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')
                        from pg_policies where schemaname in ('public', 'auth')
                        order by schemaname, tablename, policyname"

    # Déclencheurs et corps des fonctions, pas seulement leurs nombres.
    run_sql "$url" -c "select 'trigger', n.nspname, c.relname, t.tgname,
                               pg_get_triggerdef(t.oid, true)
                        from pg_trigger t
                        join pg_class c on c.oid = t.tgrelid
                        join pg_namespace n on n.oid = c.relnamespace
                        where not t.tgisinternal and n.nspname in ('public', 'auth')
                        order by n.nspname, c.relname, t.tgname"
    run_sql "$url" -c "select 'function', n.nspname, p.proname,
                               pg_get_function_identity_arguments(p.oid),
                               md5(pg_get_functiondef(p.oid))
                        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                        where n.nspname in ('public', 'app', 'auth') and p.prokind in ('f', 'p')
                        order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)"

    # ACL et autorisations : les rôles doivent être présents sur le serveur de restauration.
    run_sql "$url" -c "select 'schema_acl', nspname, coalesce(nspacl::text, '(default)')
                        from pg_namespace where nspname in ('public', 'app', 'auth')
                        order by nspname"
    run_sql "$url" -c "select 'relation_acl', n.nspname, c.relname,
                               coalesce(c.relacl::text, '(default)')
                        from pg_class c join pg_namespace n on n.oid = c.relnamespace
                        where n.nspname in ('public', 'app', 'auth')
                          and c.relkind in ('r', 'p', 'v', 'm', 'S')
                        order by n.nspname, c.relname"
    run_sql "$url" -c "select 'function_acl', n.nspname, p.proname,
                               pg_get_function_identity_arguments(p.oid),
                               coalesce(p.proacl::text, '(default)')
                        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                        where n.nspname in ('public', 'app', 'auth') and p.prokind in ('f', 'p')
                        order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)"
}

fingerprint "$SRC_URL" > "$WORKDIR/src.txt"
fingerprint "$DST_URL" > "$WORKDIR/dst.txt"
if ! diff -u "$WORKDIR/src.txt" "$WORKDIR/dst.txt"; then
    echo "ÉCHEC : la base restaurée diffère des données ou définitions source." >&2
    exit 1
fi
ROWS="$(awk -F'|' '$1 == "rows" && $2 ~ /^public\./ {s += $3} END {print s}' "$WORKDIR/src.txt")"
if [[ "${ROWS:-0}" -lt 10 ]]; then
    echo "ÉCHEC : base source quasi vide (${ROWS:-0} lignes) ; le test ne prouverait rien." >&2
    exit 1
fi
echo "    ${ROWS} lignes comparées dans le schéma public : identiques"

echo "5/5 Isolation sur la base restaurée (ACC-01 après restauration)"
VISIBLE="$(run_sql "$DST_URL" -c "set role authenticated" \
    -c "select set_config('request.jwt.claim.sub', '$ALICE', false)" \
    -c "select count(*) from public.companies" | tail -n 1)"
if [[ "$VISIBLE" != "1" ]]; then
    echo "ÉCHEC : Alice voit ${VISIBLE} entreprise(s) après restauration (attendu : 1)." >&2
    exit 1
fi
COMPANY_A="$(run_sql "$DST_URL" -c "select id from public.companies where legal_name like 'Entreprise A%' ")"
OTHER="$(run_sql "$DST_URL" -c "set role authenticated" \
    -c "select set_config('request.jwt.claim.sub', '$BOB', false)" \
    -c "select count(*) from public.audit_events where company_id = '$COMPANY_A'" | tail -n 1)"
if [[ "$OTHER" != "0" ]]; then
    echo "ÉCHEC : Bob lit ${OTHER} événement(s) d'audit de l'entreprise A." >&2
    exit 1
fi
OWN="$(run_sql "$DST_URL" -c "set role authenticated" \
    -c "select set_config('request.jwt.claim.sub', '$BOB', false)" \
    -c "select count(*) from public.audit_events" | tail -n 1)"
if [[ "${OWN:-0}" -lt 1 ]]; then
    echo "ÉCHEC : Bob ne lit pas le journal de sa propre entreprise après restauration." >&2
    exit 1
fi

echo "OK : sauvegarde, restauration, intégrité structurelle et isolation vérifiées."
