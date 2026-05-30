# Récap des changements infra — handoff pour toi

Salut, comme promis voici la liste détaillée de tout ce que j'ai touché côté infra pendant le sprint UI. Pour chaque point : la commit SHA, le bug ou le manque, pourquoi j'ai fait le changement, et comment je l'ai patché. T'es libre de revert tout ça et de le refaire à ta sauce — la grosse réécriture du watchdog Vault (#9) est sûrement celle à reprendre, le reste est plus du patch ponctuel.

Pour voir les diffs en détail : `git show <sha>`.

---

### 1. Le mot de passe DB de Vault casse le parsing d'URL

- **Sévérité** : bug, plante au démarrage du server.
- **Symptôme** : le server crash direct au boot avec `DrizzleQueryError: TypeError: Invalid URL` (pg).
- **Cause** : `vault_init` génère le mot de passe DB via `openssl rand -base64 24`. L'alphabet base64 inclut `+`, `/`, `=` — tous des caractères réservés dans une URL. Le loader Vault interpole le password brut dans `DATABASE_URL`, et `pg-connection-string` n'arrive pas à le parser.
- **Fichiers** : `apps/server/src/config/vault.ts` (+6 / -2)
- **Commit** : **`2e35421`** — `fix(server): URL-encode DB password loaded from Vault`
- **Mon fix** : `encodeURIComponent` autour de `db.password` avant l'interpolation. `pg` decode automatiquement les séquences percent-encoded, donc le round-trip est safe.
- **Alternative que tu préférerais peut-être** : changer `openssl rand -base64` → `openssl rand -hex` dans `init.sh`. Charset URL-safe, pas besoin d'encoder côté consumer.
- **Mon avis** : petit patch, peu risqué. Probablement à garder.

---

### 2. La branche `else` de `init.sh` lit le mauvais nom de champ JSON

- **Sévérité** : bug, plante à chaque restart après le premier init.
- **Symptôme** : postgres bloque indéfiniment à attendre `/vault/file/.db_pass`. `make logs-postgres` montre `En attente du secret PostgreSQL…` qui spam.
- **Cause** : dans `vault/scripts/init.sh`, la branche `if` (premier init) écrit `vault kv put secret/transcendence/database password=<valeur>`. La branche `else` (runs suivants) lit `jq -r '.data.data.db_password'`. Les noms de champs ne correspondent pas — `db_password` vs `password`. `jq` retourne `null`, le script écrit `"null"` dans `.db_pass`, et postgres essaie de démarrer avec un literal "null" comme password.
- **Fichiers** : `vault/scripts/init.sh` (+1 / -1)
- **Commit** : **`3a0ecf6`** — `fix(vault): correct field name in init.sh secret-rehydrate path`
- **Mon fix** : remplacer `db_password` par `password` dans le read.
- **Mon avis** : patch d'un caractère. À garder tel quel.

> ⚠️ Ce fix devient redondant si tu gardes l'approche watchdog (#9), qui supprime entièrement la branche `else`. Si tu revert #9, garde quand même celui-là.

---

### 3. `OAUTH42_REDIRECT_URI` + `FRONTEND_URL` manquaient dans l'env du server

- **Sévérité** : bug, retourne 500 sur `GET /api/auth/42`.
- **Symptôme** : cliquer sur "Sign up with 42" / "Continue with 42" → `OAuth 42 not configured: missing env var OAUTH42_REDIRECT_URI`.
- **Cause** : le loader Vault (`config/vault.ts`) ne pull que `client_id` et `client_secret` depuis Vault. `OAUTH42_REDIRECT_URI` c'est de la config (pas un secret) et n'était set nulle part en prod. `FRONTEND_URL` était utilisé par `server.ts` pour le CORS mais avait `http://localhost:4321` en default (mode dev), incorrect en compose.
- **Fichiers** : `compose.yml` (+7)
- **Commit** : **`7a382ac`** — `feat(infra): add OAUTH42_REDIRECT_URI + FRONTEND_URL to server env`
- **Mon fix** : ajout des deux variables dans le bloc `environment` du service `server` :
  ```yaml
  OAUTH42_REDIRECT_URI: http://localhost:8080/api/auth/42/callback
  FRONTEND_URL: http://localhost:8080
  ```
- **Mon avis** : 7 lignes additives. À garder, éventuellement avec d'autres valeurs si t'as un autre déploiement en tête.

---

### 4. Le port 3000 du server pas exposé (bloque le mode dev hybride)

- **Sévérité** : feature manquante, bloque le workflow Mode B.
- **Fichiers** : `compose.yml` (lignes décommentées)
- **Commit** : **`9d92c3a`** (gros commit, voir #5 aussi)
- **Le souci** : le service `server` avait `# - "3000:3000"` commenté. Sans ça, le serveur Astro local (Mode B, voir #5) peut pas atteindre le backend.
- **Mon fix** : décommenter le port mapping avec un commentaire qui explique quand c'est utile.
- **Mon avis** : petit changement à l'intérieur d'un plus gros commit. Si tu revert #5, à remettre si tu gardes le Mode B.

---

### 5. Makefile hardcodé sur podman ; pas d'auto-detect ; pas de target Mode B

- **Sévérité** : feature manquante, bloque les devs sur macOS+OrbStack.
- **Fichiers** : `Makefile` (réécriture +258 / -169), `README.md` (réécriture), `apps/web/astro.config.mjs` (Vite proxy ajouté), `compose.yml` (port décommenté).
- **Commit** : **`9d92c3a`** — `feat(infra): runtime auto-detect + Mode B dev workflow`
- **Mon fix** :
  1. Auto-détection du runtime en haut du Makefile :
     ```makefile
     HAS_PODMAN := $(shell command -v podman-compose >/dev/null 2>&1 && podman info >/dev/null 2>&1 && echo 1)
     ifeq ($(HAS_PODMAN),1)
       COMPOSE   ?= podman-compose
       CONTAINER ?= podman
     else
       COMPOSE   ?= docker compose
       CONTAINER ?= docker
     endif
     ```
     Le workflow Linux+podman des autres reste inchangé. Mac+OrbStack tombe sur docker compose.
  2. Remplacé chaque `podman-compose` / `podman` hardcodé par `$(COMPOSE)` / `$(CONTAINER)`.
  3. Ajouté de nouvelles targets : `dev` (compose backend + `pnpm dev` web), `rebuild-server`, `rebuild-web`, `redeploy-stub` (mac-only).
  4. Vite proxy dans `astro.config.mjs` pour que les requêtes `/api/*` du frontend dev atteignent le backend sur `:3000`.
  5. Réécrit `README.md` pour documenter Mode A (full compose) et Mode B (HMR).
- **Mon avis** : c'est le deuxième plus gros changement. Si t'as des conventions Makefile fortes, tu vas vouloir revert et refaire la détection à ta façon. Le Vite proxy + l'expose port valent peut-être le coup d'être gardés à part. Tu peux cherry-pick.

---

### 6. Les codes ANSI s'affichent en littéral sur BSD echo (macOS)

- **Sévérité** : cosmétique ; impact uniquement sur la sortie de `make help` sur macOS.
- **Fichiers** : `Makefile` (+9 / -8)
- **Commit** : **`32638f6`** — `fix(makefile): render ANSI colors on macOS BSD echo`
- **Cause** : Linux `echo` (typiquement GNU coreutils ou busybox) interprète les séquences `\033[…]m`. BSD `echo` (par défaut sur macOS) les print en littéral. La sortie de `make help` était illisible sur macOS.
- **Mon fix** : remplacer les variables couleur des séquences brutes par `$(shell printf '\033[…]m')`. Comme ça elles contiennent les vrais bytes ESC à l'expansion Make. `echo` les emit tels quels et le terminal les rend correctement sur les deux plateformes.
- **Mon avis** : pertinent uniquement si tu gardes la réécriture du Makefile (#5). Sinon le principe reste portable.

---

### 7. nginx cache les IPs des containers indéfiniment → 502 après chaque rebuild

- **Sévérité** : bug, touche tout le monde à chaque `make build`.
- **Symptôme** : après `make build` (qui recrée le container du service rebuildé avec une nouvelle IP), `localhost:8080` retourne 502 Bad Gateway. Restart `mod_security` répare ; le rebuild suivant casse à nouveau.
- **Cause** : `waf/default.conf` utilisait des hostnames littéraux dans `proxy_pass` (`http://server:3000`, `http://web:4321`). nginx les résout une seule fois au load de la config et les cache forever. La directive `resolver 127.0.0.11 valid=10s` ne kick in que pour les upstreams qui contiennent une variable.
- **Fichiers** : `waf/default.conf` (réécriture +49 / -38)
- **Commit** : **`dba4ab4`** — `fix(waf): use variable upstreams so nginx re-resolves container IPs`
- **Mon fix** :
  ```nginx
  set $upstream_server "server:3000";
  set $upstream_web    "web:4321";
  ...
  location /api { proxy_pass http://$upstream_server; ... }
  location /     { proxy_pass http://$upstream_web; ... }
  ```
  Les upstreams variables forcent nginx à utiliser le resolver à chaque requête. Le cap de 10 s du resolver (`valid=10s`) fait que les nouvelles IPs sont prises en compte dans les ~10 s qui suivent un rebuild.
- **Mon avis** : changement substantiel de la config WAF. Probablement à garder (vrai bug, vraie correction) mais t'as peut-être un style différent.

---

### 8. ModSec ne proxify pas `/uploads` → les avatars 404

- **Sévérité** : bug, casse l'affichage avatar end-to-end (Step 3).
- **Symptôme** : `POST /api/profile/avatar` réussit, retourne `avatarUrl: /uploads/avatars/<id>.webp`. Le `GET /uploads/avatars/<id>.webp` qui suit retourne 404.
- **Cause** : `waf/default.conf` n'avait que les blocs `/api`, `/socket.io`, et `/`. `/uploads/*` tombait dans le `/` et était proxifié vers le container `web` (Astro), qui ne sert pas ces fichiers. Le backend les sert via `@fastify/static`.
- **Fichiers** : `waf/default.conf` (+12)
- **Commit** : **`7d00e2e`** — `fix(waf): proxy /uploads to the backend, not the web container`
- **Mon fix** : ajouter un bloc `location /uploads { proxy_pass http://$upstream_server; ... }`, en miroir de `/api`.
- **Mon avis** : 12 lignes additives. À garder probablement.

---

### 9. Vault re-seal à chaque restart ; `vault_unseal` est one-shot

- **Sévérité** : bug, fatal pour toute la stack à chaque cycle compose.
- **Symptôme** : `make build` après le premier déploiement → server crash-loop sur `JWT_SECRET` manquant, postgres bloque sur `.db_pass` manquant. Récupération uniquement manuelle : `vault operator unseal` + `printf <pwd> > /vault/file/.db_pass`.
- **Cause** (deux problèmes couplés) :
  1. `vault_unseal` avait `restart: on-failure`. Son script first-run exit 0 quand Vault est déjà unsealed. Après ça il reste en `Exited (0)` forever. Tout restart de `vault_server` après ça re-seal Vault sans rien pour l'unsealer.
  2. Postgres consomme `/vault/file/.db_pass` à chaque boot (`rm -f` après lecture). Seule la branche `else` de `vault_init` pouvait le réécrire, et ce container est aussi one-shot — et avait le bug #2 ci-dessus.
- **Fichiers** : `vault/scripts/unseal.sh` (réécriture complète +80 / -16), `vault/scripts/init.sh` (réécriture +35 / -38), `compose.yml` (+5 / -1)
- **Commit** : **`18b4d15`** — `fix(infra): vault_unseal becomes a long-running watchdog`
- **Mon fix** : c'est LA réécriture que tu veux pas. Trois changements :
  1. `unseal.sh` devient une boucle de polling à 10 s qui maintient deux invariants :
     - Vault est unsealed (`vault operator unseal $(cat unseal.key)` si sealed)
     - `.db_pass` existe (read depuis Vault, écrit dans le fichier)
  2. `init.sh` simplifié, only first-init. La branche `else` est virée ; les runs suivants short-circuit et exit 0 (le watchdog gère le steady state).
  3. `compose.yml` : `vault_unseal` → `restart: unless-stopped` (au lieu de `on-failure`).
- **Smoke-tested** : sealer manuellement `vault_server` avec `vault operator seal` déclenche le re-unseal en ~10 s. Supprimer `.db_pass` à la main déclenche la régénération en ~10 s.
- **Mon avis** : **la réécriture que tu refuses.** Tu préféreras peut-être :
  - **Option B** : garder `vault_unseal` en one-shot mais le déclencher à chaque démarrage de container avec un autre mécanisme (compose n'a pas de hook natif "run on every up" pour les sidecars ; faudrait une approche custom).
  - **Option C** : faire que postgres pull depuis Vault directement via curl dans son entrypoint, ce qui élimine la danse de fichier.
  - **Option D** : auto-unseal Vault via Transit/cloud KMS (production-grade, demande un KMS externe).
  - **Option E** : approche "boucle avec timeout puis exit" plus simple — le container exit éventuellement mais couvre plus de cycles.
- **Ma reco pour toi** : revert ce commit, puis re-applique #2 (le field name dans `init.sh`) qui reste pertinent même si `unseal.sh` reste one-shot. Le problème de fond (Vault qui re-seal au restart) est réel et a besoin de *quelque* fix ; le watchdog c'est juste mon approche.

> Pour revert : `git revert 18b4d15`. Ensuite re-applique #2 séparément si besoin.

---

### 10. Migration de schéma `0001_*.sql` (colonne `signup_completed_at`)

- **Sévérité** : feature, changement de schéma.
- **Fichiers** : `apps/server/drizzle/0001_sparkling_the_enforcers.sql`, `meta/0001_snapshot.json`, `meta/_journal.json` (+5 dans schema.ts)
- **Commit** : **`1c1c586`** — `feat(auth): lock /signup after completion via signup_completed_at flag`
- **Ce que ça fait** : ajoute `users.signup_completed_at TIMESTAMP NULL`. Set quand l'utilisateur arrive à `/signup?step=4` ; vérifié par le gate de la page signup pour rediriger hors de `/signup` une fois complété.
- **Pourquoi c'est lié à l'infra** : la migration tourne au démarrage du server via drizzle-kit. Si une teammate a une DB existante en v0, drizzle applique 0001 cleanly. Si quelqu'un a manuellement altéré la colonne avant (on a touché ça en dev), drizzle crash avec "duplicate column" et le server crash-loop.
- **Mon avis** : feature legit, pas que de l'infra. Je le mentionne ici pour que tu saches que la migration existe et que tu puisses vérifier qu'elle s'applique cleanly sur ta DB.

---

## Tableau résumé

| # | Sévérité | Commit | Fichiers | Reco |
|---|---|---|---|---|
| 1 | Bug, plante au boot | `2e35421` | server/config/vault.ts | À garder |
| 2 | Bug, plante au restart | `3a0ecf6` | vault/init.sh | À garder |
| 3 | Bug, OAuth cassé | `7a382ac` | compose.yml | À garder |
| 4 | Port manquant | (dans `9d92c3a`) | compose.yml | À garder si Mode B gardé |
| 5 | Feature manquante (Mode B / runtime detect) | `9d92c3a` | Makefile, README, astro.config, compose.yml | **À toi** — revert + refaire ou garder |
| 6 | Cosmétique (mac help output) | `32638f6` | Makefile | À garder si #5 gardé |
| 7 | Bug, 502 après les rebuilds | `dba4ab4` | waf/default.conf | À garder (ou réécrire à ton goût) |
| 8 | Bug, avatar 404 | `7d00e2e` | waf/default.conf | À garder |
| 9 | Bug, fatal pour toute la stack | `18b4d15` | vault scripts, compose.yml | **À revert** — tu refais |
| 10 | Migration de schéma | `1c1c586` | drizzle/, schema.ts | À garder (mention only) |

Si tu veux les diffs en détail : `git show <sha>` pour n'importe lequel.
