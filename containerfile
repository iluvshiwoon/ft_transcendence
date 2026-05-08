FROM docker.io/library/node:24-alpine3.23 AS builder
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

# par défaut, pnpm gagne de la place en utilisant des liens symboliques (raccourci)
# qui pointe vers un dossier à la racine du projet. Avec deploy, je copie non pas les liens 
# raccourcis mais les vrais fichiers pointés
RUN pnpm --filter=server --prod deploy --legacy /prod/server
# RUN pnpm --filter=web --prod deploy --legacy /prod/web

FROM node:24-alpine3.23 AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /prod/server ./server
COPY --from=builder /app/apps/server/dist ./server/dist

# COPY --from=builder /prod/web ./web
# COPY --from=builder /app/apps/web/dist ./web/dist

WORKDIR /app/server
CMD ["dumb-init", "node", "dist/src/index.js"]