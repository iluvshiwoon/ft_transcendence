# Container Podman

Pour lancer l'infrastructure, accordez les droits au script d'éxecution :

```bash
chmod +x deploy.sh
```

Puis lancez :

```bash
bash deploy.sh
```

Une fois les containers en route, utilisez le makefile pour effectuer toutes les commandes souhaitées.
La règle `make help` afin de voir toutes les options possibles.

Pour vérifier que les services sont bien connectés, vérifiez dans le navigateur :
- **Astro** : http://localhost:4321
- **Fastify** : http://localhost:3000
- **Vault** : http://localhost:8200

Pour arrêter proprement l'infrastructure et nettoyer les réseaux :

```bash
make down
```

# Serveur
pnpm dev                 # lance Fastify

# Base de données
pnpm db:generate         # génère un fichier SQL depuis schema.ts (après changement de schéma)
pnpm db:migrate          # applique les migrations sur PG
pnpm db:seed             # remplit avec données de test
pnpm db:studio           # ouvre une UI web pour explorer la DB

# Container PG (à lancer une fois)
podman start dev-pg      # redémarre PG si tu l'as stoppé
podman stop dev-pg       # stoppe PG
podman exec dev-pg psql -U postgres_transcendance -d postgres_transcendance  # shell SQL

# API Backend

La référence complète de l'API (HTTP + Socket.io) est dans [`apps/server/API.md`](apps/server/API.md).
