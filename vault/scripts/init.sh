#!/bin/sh
set -e

apk add --no-cache jq openssl

export VAULT_ADDR="http://vault_server:8200"

INITIALIZED=$(vault status -format=json 2>/dev/null | jq -r '.initialized' || echo "false")

if [ "$INITIALIZED" = "true" ]; then
	echo "Vault already initialized!"
	exit 0
fi

echo "Vault initialization..."
INIT_STARTING=$(vault operator init \
	-key-shares=1 \
	-key-threshold=1 \
	-format=json)

echo "Backup of unseal key and root token..."
echo "$INIT_STARTING" | jq -r '.unseal_keys_b64[0]' > /vault/file/unseal.key
echo "$INIT_STARTING" | jq -r '.root_token'          > /vault/file/root.token

echo "Unsealing..."
vault operator unseal "$(cat /vault/file/unseal.key)"

export VAULT_TOKEN="$(cat /vault/file/root.token)"

echo "Activation KV v2..."
vault secrets enable -path=secret kv-v2

DB_PASS="$(openssl rand -base64 24)"
JWT_SECRET="$(openssl rand -base64 48)"

echo "Injecting secrets..."
vault kv put -mount=secret transcendance \
	db_password="$DB_PASS" \
	jwt_secret="$JWT_SECRET"

echo "$DB_PASS" > /vault/file/.db_pass

echo "Vault initialization completed!"