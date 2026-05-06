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
