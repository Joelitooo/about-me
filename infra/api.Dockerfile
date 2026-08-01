# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Prisma's query engine needs OpenSSL, which the slim image does not ship.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# A hoisted node_modules layout produces real directories instead of the default
# symlinks into /repo/node_modules/.pnpm, so the tree can be COPYed to the
# runtime stage without dangling links.
RUN printf 'node-linker=hoisted\n' > .npmrc

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@portfolio/api..."

COPY packages/shared packages/shared
COPY apps/api apps/api

# Generate before building: PrismaService is typed against the generated client.
RUN pnpm --filter @portfolio/api exec prisma generate
RUN pnpm --filter @portfolio/api build

# Drop the full install tree and reinstall production deps only. A second
# `pnpm install --prod` on an existing tree does not reliably prune (vitest,
# testcontainers, @swc would otherwise survive into the runtime image).
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --filter "@portfolio/api..."
RUN pnpm --filter @portfolio/api exec prisma generate

FROM node:22-bookworm-slim AS runner
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Hoisted layout: runtime dependencies live in the workspace-root node_modules.
COPY --from=builder --chown=node:node /repo/node_modules ./node_modules
COPY --from=builder --chown=node:node /repo/apps/api/node_modules ./node_modules
COPY --from=builder --chown=node:node /repo/apps/api/dist ./dist
COPY --from=builder --chown=node:node /repo/apps/api/prisma ./prisma
COPY --from=builder --chown=node:node /repo/apps/api/package.json ./package.json
COPY --chown=node:node infra/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

USER node
EXPOSE 3000

# /health answers 200 with {"status":"degraded"} when Postgres is unreachable,
# so the body is what decides health, not the status code.
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=45s \
    CMD node -e 'fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/health`).then((r) => r.json()).then((j) => process.exit(j.status === "ok" ? 0 : 1)).catch(() => process.exit(1))'

ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
