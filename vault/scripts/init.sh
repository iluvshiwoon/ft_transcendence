#!/bin/sh
# vault_init — first-boot only. Initializes Vault and seeds the project
# secrets (DB password, JWT secret, OAuth42 placeholders).
#
# On subsequent compose ups (vault already initialized) this script exits
# immediately. The vault_unseal watchdog handles steady-state — re-unsealing
# after restarts and re-creating /vault/file/.db_pass when postgres consumes
# it. Keeping the responsibilities split (init vs watchdog) avoids the
# previous failure modes where init.sh's else branch tried to read from a
# sealed Vault and silently wrote an empty .db_pass.

set -e

apk add --no-cache jq openssl

export VAULT_ADDR="http://vault_server:8200"

INITIALIZED=$(vault status -format=json 2>/dev/null | jq -r '.initialized' || echo "false")

if [ "$INITIALIZED" = "true" ]; then
	echo "Vault already initialized — vault_unseal watchdog handles re-seal and .db_pass rehydration"
	exit 0
fi

echo "Vault initialization (first boot)..."

INIT_STARTING=$(vault operator init -key-shares=1 -key-threshold=1 -format=json)

echo "Backup of unseal key and root token..."
echo "$INIT_STARTING" | jq -r '.unseal_keys_b64[0]' > /vault/file/unseal.key
echo "$INIT_STARTING" | jq -r '.root_token'          > /vault/file/root.token
chmod 644 /vault/file/root.token
chmod 644 /vault/file/unseal.key

echo "Unsealing..."
vault operator unseal "$(cat /vault/file/unseal.key)"

export VAULT_TOKEN="$(cat /vault/file/root.token)"

echo "Activation KV v2..."
vault secrets enable -path=secret kv-v2

DB_PASS="$(openssl rand -base64 24)"
JWT_SECRET="$(openssl rand -base64 48)"

vault kv put -mount=secret transcendence/jwt \
	value="$JWT_SECRET"

vault kv put -mount=secret transcendence/database \
	password="$DB_PASS"

vault kv put -mount=secret transcendence/oauth42 \
	client_id="REPLACE_ME" \
	client_secret="REPLACE_ME"

# Bootstrap .db_pass once. After this, the vault_unseal watchdog rewrites it
# whenever postgres consumes the file on a subsequent boot.
echo "$DB_PASS" > /vault/file/.db_pass

echo "Vault first-init done."
