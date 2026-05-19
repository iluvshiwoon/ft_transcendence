#!/bin/sh
set -e

apk add --no-cache jq

export VAULT_ADDR="http://vault_server:8200"

if [ ! -f /vault/file/root.token ]; then
	echo "root.token not found, Vault probably not initialized yet"
	exit 1
fi

export VAULT_TOKEN="$(cat /vault/file/root.token)"

SEALED=$(vault status -format=json | jq -r '.sealed')

if [ "$SEALED" = "false" ]; then
	echo "Vault already unsealed"
	exit 0
fi

echo "Unsealing Vault..."
vault operator unseal "$(cat /vault/file/unseal.key)"

echo "Vault successfully unsealed"