FROM node:24-alpine AS builder
# ENV PNPM_HOME="/pnpm"
# ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /container_transcendance
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store corepack enable && pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:24-alpine AS runner
WORKDIR /container_transcendance
COPY --from=builder /container_transcendance/apps/web/dist ./web
COPY --from=builder /container_transcendance/apps/server/dist ./server
COPY --from=builder /container_transcendance/node_modules ./node_modules
CMD ["node", "server/index.js"]