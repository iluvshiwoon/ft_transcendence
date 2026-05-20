#!/bin/sh
set -e

apk add --no-cache jq openssl

export VAULT_ADDR="http://vault_server:8200"

INITIALIZED=$(vault status -format=json 2>/dev/null | jq -r '.initialized' || echo "false")

if [ "$INITIALIZED" = "false" ]; then
    echo "Vault initialization..."
    INIT_STARTING=$(vault operator init \
        -key-shares=1 \
        -key-threshold=1 \
        -format=json)

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
else
    echo "Vault already initialized!"
    echo "Retrieving existing secrets for Postgres..."
    
    export VAULT_TOKEN="$(cat /vault/file/root.token)"
    
    DB_PASS=$(vault kv get -format=json -mount=secret transcendence/database | jq -r '.data.data.db_password')
fi

echo "$DB_PASS" > /vault/file/.db_pass

echo "Vault initialization task completed successfully!"