# Bugs infra restants — branche Senshy après `577ec62`

J'ai pull ton commit, fait `make clean && make build` propre. Le server boot bien maintenant, mais voilà les 3 trucs qui méritent ton attention.

---

## 1.  mod_security crash-loop — `:8080` injoignable

Bug actif, bloque tout l'accès au front via le WAF.

### Symptôme

```
$ make ps
mod_security  Exited (1) 4 seconds ago  0.0.0.0:8080->8080/tcp

$ podman logs --tail 3 mod_security
chown: changing ownership of '/var/log/nginx/error.log': Permission denied
chown: changing ownership of '/var/log/nginx/error.log': Permission denied
chown: changing ownership of '/var/log/nginx/error.log': Permission denied
```

```
$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/
000  (DOWN)
```

### Cause

Dans `compose.yml` :
```yaml
mod_security:
  user: root
  command: >
    sh -c "chown nginx:nginx /var/log/nginx/error.log &&
    /docker-entrypoint.sh nginx -g 'daemon off;'"
```

Dans l'image OWASP modsecurity-crs, `error.log` est un **symlink vers `/dev/stderr`** :
```
$ podman run --rm --entrypoint=sh docker.io/owasp/modsecurity-crs:4.25.0-nginx-lts -c "ls -la /var/log/nginx/"
lrwxrwxrwx  access.log -> /dev/stdout
lrwxrwxrwx  error.log  -> /dev/stderr
```

En podman rootless, `/dev` est bind-mount avec ses propres mappings UID. `chown` sur un symlink suit la cible (le device dans `/dev`), qui est en dehors de l'espace utilisateur du container → permission denied. Sous docker rootful classique ça passe parce que t'es vrai root system-wide.

### Fix possibles

**Option 1 (le plus propre) — virer le chown :**
```yaml
mod_security:
  command: ["nginx", "-g", "daemon off;"]
```
nginx écrit sur `/dev/stderr` sans avoir besoin de chown.

**Option 2 — chown sans suivre le symlink :**
```yaml
command: >
  sh -c "chown -h nginx:nginx /var/log/nginx/error.log 2>/dev/null;
  /docker-entrypoint.sh nginx -g 'daemon off;'"
```
Le `-h` change le symlink lui-même (pas la cible). `2>/dev/null` au cas où.

**Option 3 — laisser tomber `user: root`** et utiliser le user par défaut de l'image.

---

## 2.  nginx cache les IPs des containers (handoff #7, toujours présent)

Bug latent — pas urgent maintenant parce que mod_security est down, mais ça va te frapper dès que tu rebuilds n'importe quel service après l'avoir débloqué.

### Symptôme attendu

```
make build       # tout fonctionne
# ... tu modifies un fichier dans apps/server ...
make build       # rebuild → server change d'IP
                 # → nginx a caché l'ancienne IP
curl :8080       # 502 Bad Gateway
```

### Cause

`waf/default.conf` :
```nginx
location /api      { proxy_pass http://server:3000; ... }
location /uploads  { proxy_pass http://server:3000; ... }
location /         { proxy_pass http://web:4321;    ... }
```

nginx résout les hostnames une seule fois au load de la conf et cache forever. Le `resolver 127.0.0.11 valid=10s` que t'as ne kick in que pour les upstreams qui contiennent une variable.

### Fix

```nginx
set $upstream_server "server:3000";
set $upstream_web    "web:4321";

location /api      { proxy_pass http://$upstream_server; ... }
location /uploads  { proxy_pass http://$upstream_server; ... }
location /         { proxy_pass http://$upstream_web;    ... }
```

L'upstream variable force nginx à passer par le resolver à chaque requête. Le `valid=10s` fait que les nouvelles IPs sont prises en compte dans les ~10 s qui suivent un rebuild.

---

## 3.  Vault re-seal au restart (handoff #9, toujours présent)

Bug latent. `compose.yml` a toujours :
```yaml
vault_unseal:
  ...
  restart: on-failure
```

### Le scénario qui va casser

1. Premier `make build` : `vault_init` génère les clés, `vault_unseal` les utilise, écrit `.db_pass`, exit 0.
2. N'importe quoi qui restart `vault_server` (`podman restart`, OOM kill, healthcheck timeout, coupure réseau, host reboot) → Vault redémarre **sealed**.
3. `vault_unseal` est en `Exited (0)`, `restart: on-failure` ne le ressuscite que sur échec, pas sur "Vault est sealed à nouveau".
4. Postgres a `rm -f` son `.db_pass` au boot précédent → bloque sur `En attente du secret PostgreSQL...`
5. Server crash-loop : `vault is sealed` puis `JWT_SECRET missing`.
6. Récupération uniquement manuelle (`vault operator unseal` + `printf <pwd> > /vault/file/.db_pass`).

### Fix

Plusieurs approches possibles :

- **Watchdog long-running** : `vault_unseal` devient une boucle qui poll Vault toutes les 10 s et unseal + write `.db_pass` si nécessaire. C'était mon fix dans le handoff (`18b4d15`), commit que t'as choisi de pas merger.
- **Postgres pull direct depuis Vault** dans son entrypoint via curl, élimine la danse de fichier `.db_pass`.
- **Auto-unseal Vault via Transit/cloud KMS** (production-grade, demande un KMS externe).

Le minimum viable c'est de faire en sorte que **quelque chose** unseal Vault automatiquement après un restart. `restart: on-failure` sur un script one-shot ne le fera pas.

---

## Récap

| Bug | Sévérité | Action |
|-----|----------|--------|
| mod_security chown |  Active blocker, `:8080` down | Choisir option 1, 2 ou 3 |
| nginx cache IPs (#7) |  Latent, frappera au prochain rebuild | Variable upstreams dans `default.conf` |
| Vault re-seal (#9) |  Latent, frappera au prochain restart Vault | Watchdog ou refactor |

Une fois mod_security débloqué, je peux re-tester end-to-end (avatar upload, OAuth, signup) et confirmer que le reste tient.
