# syntax=docker/dockerfile:1.7

FROM node:25-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# Manifests first: this layer is cached until a dependency actually changes.
# Every workspace manifest is required, because --frozen-lockfile validates the
# lockfile against the whole workspace even when the install is filtered.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@portfolio/web..."

COPY packages/shared packages/shared
COPY apps/web apps/web

# Vite inlines VITE_* at build time, so these are build args, not runtime env.
# They are public values (they ship in the bundle) — never pass a secret here.
ARG VITE_API_URL
ARG VITE_UMAMI_URL=""
ARG VITE_UMAMI_WEBSITE_ID=""
ENV VITE_API_URL=$VITE_API_URL \
    VITE_UMAMI_URL=$VITE_UMAMI_URL \
    VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL build arg is required" >&2; exit 1)
RUN pnpm --filter @portfolio/web build

FROM nginx:1.31-alpine AS runner
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=5s \
    CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
