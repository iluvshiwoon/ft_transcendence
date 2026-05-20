#!/usr/bin/env bash
# Push les secrets du back dans Vault.
# À lancer après que Vault tourne (`make build` ou `make up`).
# Idempotent : peut être relancé autant de fois que voulu.

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-dev_root_token}"

# Récupère les valeurs depuis apps/server/.env (= source de vérité pour le dev).
if [ ! -f apps/server/.env ]; then
    echo "Error: apps/server/.env not found. Run from project root." >&2
    exit 1
fi

set -a
source apps/server/.env
set +a

put_secret() {
    local path="$1"
    local payload="$2"

    curl -sf -X POST \
        -H "X-Vault-Token: ${VAULT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "${payload}" \
        "${VAULT_ADDR}/v1/secret/data/${path}" \
        > /dev/null

    echo "  ✓ ${path}"
}

echo "Pushing secrets to Vault at ${VAULT_ADDR}..."

put_secret "transcendence/jwt" \
    "$(printf '{"data":{"value":"%s"}}' "${JWT_SECRET}")"

put_secret "transcendence/oauth42" \
    "$(printf '{"data":{"client_id":"%s","client_secret":"%s"}}' "${OAUTH42_CLIENT_ID}" "${OAUTH42_CLIENT_SECRET}")"

put_secret "transcendence/database" \
    "$(printf '{"data":{"url":"%s"}}' "${DATABASE_URL}")"

echo "Done."
