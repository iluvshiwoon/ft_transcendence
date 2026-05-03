FROM docker.io/library/node:24-alpine3.23 AS builder
# ENV PNPM_HOME="/pnpm"
# ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store corepack enable && pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:24-alpine3.23 AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/dist ./web
COPY --from=builder /app/apps/server/dist ./server
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "server/index.js"]