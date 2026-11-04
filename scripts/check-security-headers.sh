#!/usr/bin/env bash
set -euo pipefail
umask 077

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Usage : $0 https://hote-public" >&2
  exit 2
fi
BASE_URL="${BASE_URL%/}"
if [[ ! "$BASE_URL" =~ ^https://[[:alnum:].-]+(:[0-9]+)?$ ]]; then
  echo "Erreur : fournir uniquement une origine HTTPS publique, sans chemin ni identifiants." >&2
  exit 2
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

fail() {
  echo "ERREUR : $*" >&2
  exit 1
}

check_route() {
  local path="$1"
  local header_file="$WORKDIR/headers"
  local response status effective_url
  local x_content_type x_frame referrer hsts permissions csp powered_by

  response="$(curl --silent --show-error --location --proto-redir '=https' \
    --max-redirs 5 --connect-timeout 10 --max-time 30 \
    --dump-header "$header_file" --output /dev/null \
    --write-out '%{http_code}\n%{url_effective}' \
    "${BASE_URL}${path}")" || fail "requête HTTP échouée pour ${path}"
  status="${response%%$'\n'*}"
  effective_url="${response#*$'\n'}"

  [[ "$status" =~ ^2[0-9][0-9]$ ]] || fail "${path} répond HTTP ${status}, attendu 2xx"
  [[ "$effective_url" == "$BASE_URL" || "$effective_url" == "$BASE_URL/"* ]] \
    || fail "${path} redirige hors de l'origine vérifiée"

  while IFS='=' read -r key value; do
    case "$key" in
      x-content-type-options) x_content_type="$value" ;;
      x-frame-options) x_frame="$value" ;;
      referrer-policy) referrer="$value" ;;
      strict-transport-security) hsts="$value" ;;
      permissions-policy) permissions="$value" ;;
      content-security-policy) csp="$value" ;;
      x-powered-by) powered_by="$value" ;;
    esac
  done < <(python3 - "$header_file" <<'PY'
import re
import sys

raw = open(sys.argv[1], "rb").read().decode("iso-8859-1")
blocks = re.split(r"\r?\n\r?\n", raw)
responses = [block for block in blocks if block.lstrip().startswith("HTTP/")]
if not responses:
    raise SystemExit("Aucun bloc de réponse HTTP trouvé")
headers = {}
for line in responses[-1].splitlines()[1:]:
    if ":" in line:
        name, value = line.split(":", 1)
        headers[name.strip().lower()] = value.strip()
for name in (
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "strict-transport-security",
    "permissions-policy",
    "content-security-policy",
    "x-powered-by",
):
    print(f"{name}={headers.get(name, '')}")
PY
)

  [[ "${x_content_type:-}" == "nosniff" ]] \
    || fail "${path} : X-Content-Type-Options absent ou incorrect"
  [[ "${x_frame:-}" == "DENY" ]] \
    || fail "${path} : X-Frame-Options absent ou incorrect"
  [[ "${referrer:-}" == "strict-origin-when-cross-origin" ]] \
    || fail "${path} : Referrer-Policy absent ou incorrect"
  [[ "${hsts:-}" =~ (^|\;[[:space:]]*)max-age=([0-9]+) ]] \
    || fail "${path} : Strict-Transport-Security absent ou max-age invalide"
  (( BASH_REMATCH[2] >= 31536000 )) \
    || fail "${path} : HSTS doit avoir une durée d’au moins un an"

  for directive in 'camera=()' 'microphone=()' 'geolocation=()' 'payment=()' 'usb=()'; do
    [[ "${permissions:-}" == *"$directive"* ]] \
      || fail "${path} : Permissions-Policy ne contient pas ${directive}"
  done
  for directive in "base-uri 'self'" "form-action 'self'" \
    "frame-ancestors 'none'" "object-src 'none'"; do
    [[ "${csp:-}" == *"$directive"* ]] \
      || fail "${path} : Content-Security-Policy ne contient pas ${directive}"
  done
  [[ -z "${powered_by:-}" ]] || fail "${path} : l’en-tête X-Powered-By est présent"

  echo "OK ${path} — HTTP ${status}, en-têtes de sécurité conformes"
}

for path in / /login /dashboard; do
  check_route "$path"
done
