# Phase 4 - Technical Specification

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. High-level overview in [`plan.md`](plan.md).

This document is the implementation contract for Phase 4. It is written for an agent (or developer) to follow top-to-bottom: exact file paths, full contents for every new infra file, and the commands to run. Phase 4 **containerizes what already exists** and produces one Compose file that Phase 5 can deploy unchanged. It does **not** create the Cloudflare Tunnel, touch DNS, or provision the Pi (Phase 5), and it does not add CI (Phase 6).

---

## 1. Scope

**In scope**

- Root `.dockerignore` so the build context stays small and secret-free.
- `infra/web.Dockerfile`: multi-stage — pnpm/Vite builder → `nginx:alpine` serving static files.
- `infra/nginx.conf`: SPA fallback, asset caching, gzip, security headers, `/healthz`.
- `infra/api.Dockerfile`: multi-stage — pnpm/Nest builder (with `prisma generate`) → slim Node runtime as non-root.
- `infra/api-entrypoint.sh`: `prisma migrate deploy` then `exec node dist/main.js`.
- `infra/docker-compose.yml`: `web`, `api`, `postgres`, `umami`, `cloudflared`; absorbs and replaces `infra/docker-compose.umami.yml`.
- `infra/cloudflared/config.yml`: ingress skeleton (hostnames → services), behind a Compose profile.
- `infra/.env.example`: new deployment variables; `.gitignore` entry for tunnel credentials.
- Move `prisma` from `devDependencies` to `dependencies` in `apps/api/package.json` (the CLI is now needed at container start).
- ARM64-capable builds verified with Buildx.

**Out of scope (later phases)**

- Creating the tunnel, its `credentials.json`, DNS records, and Pi provisioning (Phase 5).
- GitHub Actions build/push/deploy, registry publishing, coverage gates, Uptime Kuma (Phase 6).
- A tightened Content-Security-Policy (needs the final Umami/analytics origins — Phase 6).
- Runtime-configurable frontend env (Vite inlines `VITE_*` at build time; see §9).
- Postgres backups, log shipping, resource limits, multi-replica scaling.
- Any change to application behaviour: no new endpoints, no schema change, no UI change.

## 2. Conventions

- **Package manager:** pnpm 9 via Corepack (`packageManager: pnpm@9.0.0`). Never `npm`/`yarn`.
- **Node:** 22 (matches `.nvmrc`) in every build and runtime stage.
- **Build context:** the **repo root**, not `infra/`. Both images need `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.base.json`, and `packages/shared`. Compose expresses this as `context: ..` + `dockerfile: infra/<name>.Dockerfile`.
- **Image naming:** `portfolio-web` / `portfolio-api`, tag `local` for local builds. Registry tags arrive in Phase 6.
- **Container names:** `portfolio-*`, matching the Phase 3 `portfolio-pg` / `portfolio-umami`.
- **Service DNS:** containers reach each other by service name (`postgres`, `api`, `umami`) on the default Compose network. `localhost` inside a container means that container.
- **Published ports:** bound to `127.0.0.1` only. Public traffic arrives exclusively through the tunnel, so nothing is exposed on the LAN or router.
- **Secrets:** only in gitignored `infra/.env`, injected via Compose `environment:`. Never `COPY` an `.env` into an image, never bake a secret into a build arg.
- **Env contract:** required values use `${VAR:?message}` so Compose fails fast instead of silently defaulting.
- **Line endings:** `infra/api-entrypoint.sh` must be LF and executable (`chmod +x`), or the container fails with `exec format error`.

## 3. Prerequisites

1. Phases 0–3 complete: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm -r build` all pass at the repo root.
2. Docker Engine with Compose v2 (`docker compose version`) and Buildx (`docker buildx version`).
3. `infra/.env` exists with real `POSTGRES_PASSWORD` and `APP_SECRET` from Phase 3, and `infra/postgres/init.sql` is unchanged.
4. Decide the domain now — it is compiled into the web bundle and allowed by the API's CORS. This spec uses `example.com`; substitute yours everywhere.
5. Stop anything already holding host ports 5432/3000/8080 (including a Phase 3 `docker compose -f infra/docker-compose.umami.yml` stack):

```bash
docker compose -f infra/docker-compose.umami.yml down
```

The named volume `portfolio-pg-data` is reused, so Umami's data and your app data survive. Note that Compose prefixes volumes with the project name — see §6 step 2 if `docker volume ls` shows the old volume under a different prefix.

6. Create a feature branch before making any changes:

```bash
git checkout -b feature/phase-4
```

All Phase 4 work happens on this branch. Do not commit directly to `main`.

## 4. Target file tree

```
about-me/
├── .dockerignore                     # new
├── .gitignore                        # updated (tunnel credentials)
├── apps/
│   └── api/
│       └── package.json              # updated (prisma -> dependencies)
├── infra/
│   ├── .env.example                  # updated
│   ├── api.Dockerfile                # new
│   ├── api-entrypoint.sh             # new
│   ├── web.Dockerfile                # new
│   ├── nginx.conf                    # new
│   ├── docker-compose.yml            # new (replaces docker-compose.umami.yml)
│   ├── docker-compose.umami.yml      # DELETED
│   ├── cloudflared/
│   │   └── config.yml                # new
│   └── postgres/
│       └── init.sql                  # unchanged (Phase 3)
├── README.md                         # updated (Docker commands)
└── phases/
    └── phase-4/
        ├── plan.md
        └── spec.md
```

No new pnpm packages. `pnpm-lock.yaml` changes only because `prisma` moves between dependency groups.

## 5. File-by-file specification

### 5.1 `.dockerignore` (repo root)

Without this, the context includes every `node_modules` (hundreds of MB), stale `dist` output that would shadow a fresh build, and local `.env` files holding real secrets.

```gitignore
# VCS & docs
.git
.github
phases
*.md
!README.md

# Dependencies & build output
**/node_modules
.pnpm-store
**/dist
**/build
**/*.tsbuildinfo

# Secrets — never in a build context
**/.env
**/.env.*
!**/.env.example
infra/cloudflared/credentials.json

# Test & tool output
**/coverage
**/test-results
**/playwright-report
**/blob-report
**/playwright/.cache

# Editor / OS
**/.DS_Store
.idea
.vscode
```

### 5.2 `infra/nginx.conf`

Mounted as the default server block. Cloudflare terminates TLS, so this listens on plain HTTP inside the container.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Cloudflare terminates TLS and forwards the visitor IP in CF-Connecting-IP.
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml application/manifest+json;

    # Vite emits content-hashed filenames here, so they can never go stale.
    location /assets/ {
        expires 1y;
        try_files $uri =404;
    }

    # The HTML entry point must always be revalidated, or clients pin an old bundle.
    location = /index.html {
        expires -1;
    }

    location = /healthz {
        access_log off;
        default_type text/plain;
        return 200 "ok\n";
    }

    # Any unknown path is a client-side route owned by react-router.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Why `expires` instead of `add_header Cache-Control`:** an `add_header` inside a `location` block discards the `add_header` directives inherited from `server`, which would silently drop the three security headers on assets and on `index.html`. `expires` sets `Cache-Control` without touching inheritance. The cost is losing the `immutable` token; content hashing already makes revalidation cheap.

### 5.3 `infra/web.Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS builder
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

FROM nginx:1.27-alpine AS runner
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=5s \
    CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

**Notes**

- `packages/shared` is copied because `apps/web` imports types from `@portfolio/shared` and aliases `@shared/*` to its source; the alias resolves at build time, not through a published artifact.
- `tsconfig.base.json` is copied because `apps/web/tsconfig.json` extends it, and esbuild reads the resolved config for JSX settings.
- The final stage carries no Node runtime and no `node_modules` — only static files plus nginx.
- If the filtered install ever complains about the lockfile, fall back to a plain `pnpm install --frozen-lockfile`. It is slower but always consistent.

### 5.4 `infra/api-entrypoint.sh`

```sh
#!/bin/sh
set -eu

echo "[entrypoint] applying database migrations"
# Idempotent: applies only migrations not yet recorded in _prisma_migrations.
./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] starting API"
# exec so Node becomes PID 1 and receives SIGTERM from `docker stop` directly.
exec node dist/main.js
```

### 5.5 `infra/api.Dockerfile`

```dockerfile
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
```

**Notes**

- `apps/api` imports `@portfolio/shared` only via `import type`, so nothing from `packages/shared` survives compilation and the runtime image needs no copy of it. The builder still needs it for typechecking.
- The second `COPY ... /repo/apps/api/node_modules` merges the few package-local entries into `/app/node_modules`. It is harmless if that directory is nearly empty; under the hoisted layout the `.bin` shims the entrypoint needs live in the root `node_modules/.bin`.
- The copied tree contains a dangling `node_modules/@portfolio/shared` symlink, because workspace packages are linked rather than installed. Nothing resolves it at runtime (the imports are type-only), so it is cosmetic — but do not "fix" it by copying `packages/shared`, which would ship TypeScript source into the runtime image.
- Debian (glibc) rather than Alpine (musl) means Prisma's default engine targets work with no `binaryTargets` change in `schema.prisma`. See §9 for the Alpine variant.
- If `pnpm install` prints a Prisma "no schema found" hint during the manifest-only layer, ignore it: the explicit `prisma generate` after the source copy is what matters.
- The production install **deletes** `node_modules` first. A second `pnpm install --prod` on top of a full install does not reliably prune; without the `rm -rf`, vitest/testcontainers/@swc survive into the runtime image.

### 5.6 `apps/api/package.json` (update)

`prisma migrate deploy` runs at container start, so the CLI is a runtime dependency and must survive the `--prod` prune. Move the existing entry — do not change the version:

```jsonc
{
  "dependencies": {
    // ...existing entries...
    "prisma": "^6.19.3",
  },
  "devDependencies": {
    // "prisma" removed from here
  },
}
```

Then refresh the lockfile without touching `node_modules` content:

```bash
pnpm install --lockfile-only
```

Commit both `apps/api/package.json` and `pnpm-lock.yaml`; the Dockerfiles use `--frozen-lockfile` and will fail if the lockfile is stale.

### 5.7 `infra/docker-compose.yml`

The single source of truth for the stack. `postgres` and `umami` are carried over from Phase 3's `docker-compose.umami.yml` with host ports narrowed to loopback.

```yaml
name: portfolio

services:
  postgres:
    image: postgres:16-alpine
    container_name: portfolio-pg
    restart: unless-stopped
    ports:
      # Loopback only: nothing on the LAN can reach the database.
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-portfolio}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in infra/.env}
      POSTGRES_DB: ${POSTGRES_DB:-portfolio}
    volumes:
      - portfolio-pg-data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/01-umami.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-portfolio} -d ${POSTGRES_DB:-portfolio}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build:
      context: ..
      dockerfile: infra/api.Dockerfile
    image: portfolio-api:local
    container_name: portfolio-api
    restart: unless-stopped
    ports:
      - "127.0.0.1:${API_PORT:-3000}:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      # Host is the service name, not localhost, and the DB is the app database.
      DATABASE_URL: postgresql://${POSTGRES_USER:-portfolio}:${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in infra/.env}@postgres:5432/${POSTGRES_DB:-portfolio}?schema=public
      # Must list the public origin the SPA is served from, or the browser blocks it.
      CORS_ORIGIN: ${CORS_ORIGIN:?Set CORS_ORIGIN in infra/.env}
      THROTTLE_TTL_MS: ${THROTTLE_TTL_MS:-60000}
      THROTTLE_LIMIT: ${THROTTLE_LIMIT:-20}
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: ..
      dockerfile: infra/web.Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:?Set VITE_API_URL in infra/.env}
        VITE_UMAMI_URL: ${VITE_UMAMI_URL-}
        VITE_UMAMI_WEBSITE_ID: ${VITE_UMAMI_WEBSITE_ID-}
    image: portfolio-web:local
    container_name: portfolio-web
    restart: unless-stopped
    ports:
      - "127.0.0.1:${WEB_PORT:-8080}:80"

  umami:
    # Pin to a digest before deploying (see §9); floating tags break reproducibility.
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: portfolio-umami
    restart: unless-stopped
    ports:
      - "127.0.0.1:${UMAMI_PORT:-3001}:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-portfolio}:${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in infra/.env}@postgres:5432/umami
      APP_SECRET: ${APP_SECRET:?Set APP_SECRET in infra/.env}
      DISABLE_TELEMETRY: "1"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/heartbeat || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: portfolio-cloudflared
    restart: unless-stopped
    # Opt-in: `docker compose up -d` skips this until Phase 5 creates credentials.
    profiles: ["tunnel"]
    command: tunnel --no-autoupdate --config /etc/cloudflared/config.yml run
    volumes:
      - ./cloudflared:/etc/cloudflared:ro
    depends_on:
      - web
      - api
      - umami

volumes:
  portfolio-pg-data:
```

**Notes**

- Compose loads `infra/.env` automatically because the project directory is the compose file's directory. Passing `--env-file infra/.env` explicitly (as Phase 3 did) is equivalent.
- `web` deliberately does not `depends_on` `api`: nginx only serves static files, and the browser calls the API on its own public hostname. A dependency would just delay startup.
- No `version:` key — it is obsolete in Compose v2 and emits a warning.
- `${VITE_UMAMI_URL-}` (single dash) resolves to an empty string when unset, which is exactly how `UmamiAnalytics` disables itself.

### 5.8 `infra/cloudflared/config.yml`

Ingress skeleton. The tunnel UUID and `credentials.json` are produced in Phase 5; until then this file is inert because the service sits behind the `tunnel` profile.

```yaml
# Tunnel UUID and credentials are created in Phase 5:
#   cloudflared tunnel create portfolio
#   cloudflared tunnel route dns portfolio example.com
tunnel: REPLACE_WITH_TUNNEL_UUID
credentials-file: /etc/cloudflared/credentials.json
no-autoupdate: true

# Hostnames resolve to Compose service names on the internal network.
ingress:
  - hostname: example.com
    service: http://web:80
  - hostname: www.example.com
    service: http://web:80
  - hostname: api.example.com
    service: http://api:3000
  - hostname: analytics.example.com
    service: http://umami:3000
  # Required: cloudflared rejects a config whose last rule is not a catch-all.
  - service: http_status:404
```

`credentials.json` is a secret and must never be committed. Add to the root `.gitignore`:

```gitignore
# Cloudflare Tunnel credentials (Phase 5)
infra/cloudflared/credentials.json
```

### 5.9 `infra/.env.example` (update)

Extends the Phase 3 file; the first block is unchanged so existing `infra/.env` files stay valid.

```env
# Shared Postgres (also used by apps/api via localhost:5432)
POSTGRES_USER=portfolio
POSTGRES_DB=portfolio
# URL-safe secret — generate: openssl rand -hex 24
POSTGRES_PASSWORD=

# Umami session/signing secret (min ~32 chars) — generate: openssl rand -hex 32
APP_SECRET=

# --- Phase 4: host port bindings (all bound to 127.0.0.1) ---
WEB_PORT=8080
API_PORT=3000
UMAMI_PORT=3001
POSTGRES_PORT=5432

# --- Phase 4: API runtime ---
# Comma-separated list of origins allowed to call the API from a browser.
CORS_ORIGIN=http://localhost:8080
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=20

# --- Phase 4: web build args (PUBLIC — inlined into the JS bundle) ---
# Never put a secret here. Changing any of these requires rebuilding the web image.
VITE_API_URL=http://localhost:3000
VITE_UMAMI_URL=http://localhost:3001
VITE_UMAMI_WEBSITE_ID=

# --- Phase 5 values, for reference ---
# CORS_ORIGIN=https://example.com
# VITE_API_URL=https://api.example.com
# VITE_UMAMI_URL=https://analytics.example.com
```

The defaults above describe a **local** container run, so Phase 4 is verifiable before any DNS exists. Phase 5 swaps in the commented production values and rebuilds `web`.

### 5.10 Delete `infra/docker-compose.umami.yml`

Phase 3 anticipated this merge. The old dev workflow is now a service subset:

```bash
git rm infra/docker-compose.umami.yml
# Phase 3 equivalent, using the unified file:
docker compose -f infra/docker-compose.yml up -d postgres umami
```

Anything that referenced the old path (notes, shell history, the Phase 3 spec's commands) should be read as the command above. Do not edit `phases/phase-3/spec.md` — it is a record of that phase.

### 5.11 `README.md` (update)

Add a Docker section after **Commands** so a fresh clone can run the stack. Content to add (rendered as a `## Docker` heading, an intro paragraph, and one `bash` block):

> **## Docker**
>
> The whole stack is described by `infra/docker-compose.yml` (`web`, `api`, `postgres`, `umami`, and `cloudflared`). Copy `infra/.env.example` to `infra/.env` and fill the secrets first.
>
> ```bash
> docker compose -f infra/docker-compose.yml build          # build web + api images
> docker compose -f infra/docker-compose.yml up -d          # start everything but the tunnel
> docker compose -f infra/docker-compose.yml ps             # check health
> docker compose -f infra/docker-compose.yml logs -f api    # follow API logs
> docker compose -f infra/docker-compose.yml up -d postgres umami   # just the DB + analytics
> docker compose -f infra/docker-compose.yml down           # stop (volumes are kept)
> ```
>
> The web image bakes `VITE_*` values at build time, so rebuild it after changing them. The API applies `prisma migrate deploy` on every start.

Also update the Prerequisites bullet to mention Compose v2 and Buildx.

## 6. Execution order (commands)

Run from the repo root (`/home/joelito/about-me`):

```bash
# 0. Feature branch
git checkout -b feature/phase-4

# 1. Create the files from sections 5.1–5.9, then move the Prisma CLI (5.6)
pnpm install --lockfile-only
chmod +x infra/api-entrypoint.sh

# 2. Retire the Phase 3 compose file and free the ports
docker compose -f infra/docker-compose.umami.yml down
git rm infra/docker-compose.umami.yml
# The unified file uses project name `portfolio`. If `docker volume ls` shows the
# old volume as `infra_portfolio-pg-data`, either keep the fresh volume (Umami
# needs re-setup) or rename it:
#   docker volume create portfolio_portfolio-pg-data
#   docker run --rm -v infra_portfolio-pg-data:/from -v portfolio_portfolio-pg-data:/to \
#     alpine sh -c 'cd /from && cp -a . /to'

# 3. Env surface
cp infra/.env.example infra/.env   # or merge the new keys into an existing infra/.env
# keep the Phase 3 POSTGRES_PASSWORD / APP_SECRET values

# 4. Validate the compose file before building anything
docker compose -f infra/docker-compose.yml config >/dev/null

# 5. Build both images
docker compose -f infra/docker-compose.yml build

# 6. Start everything except the tunnel
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps   # all four services healthy

# 7. Smoke test (section 8)
curl -sf http://127.0.0.1:8080/healthz
curl -s http://127.0.0.1:8080/ | head -c 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/some/deep/link   # 200
curl -s http://127.0.0.1:3000/health                                            # status ok
curl -sf http://127.0.0.1:3001/api/heartbeat
docker compose -f infra/docker-compose.yml logs api | grep -i migrat

# 8. Prove migrations ran against the database
docker compose -f infra/docker-compose.yml exec postgres \
  psql -U portfolio -d portfolio -c '\dt'

# 9. Confirm the API is not running as root
docker compose -f infra/docker-compose.yml exec api whoami   # node

# 10. Confirm no secrets were baked into the web image
docker run --rm --entrypoint sh portfolio-web:local -c 'grep -rl "POSTGRES_PASSWORD" /usr/share/nginx/html || echo clean'

# 11. ARM64 build check (native on the Pi; QEMU-emulated elsewhere)
docker buildx build --platform linux/arm64 -f infra/api.Dockerfile -t portfolio-api:arm64 .
docker buildx build --platform linux/arm64 -f infra/web.Dockerfile \
  --build-arg VITE_API_URL=https://api.example.com -t portfolio-web:arm64 .

# 12. Repo checks still green (Docker changes must not affect the app)
pnpm typecheck
pnpm lint
pnpm test

# 13. Commit on feature/phase-4
git add .dockerignore .gitignore README.md apps/api/package.json pnpm-lock.yaml infra phases/phase-4
git commit -m "feat(infra): dockerize web and api with unified compose stack (phase 4)"
```

## 7. Acceptance criteria

Phase 4 is complete when **all** of the following hold:

- [ ] `docker compose -f infra/docker-compose.yml config` succeeds, and fails with a clear message when `POSTGRES_PASSWORD`, `APP_SECRET`, `CORS_ORIGIN`, or `VITE_API_URL` is missing.
- [ ] `docker compose build` produces `portfolio-web:local` and `portfolio-api:local`.
- [ ] `docker compose up -d` brings `postgres`, `api`, `web`, and `umami` to `healthy`; `cloudflared` is not started without the `tunnel` profile.
- [ ] `http://127.0.0.1:8080/` serves the built SPA, and `/some/deep/link` returns 200 with `index.html` (react-router deep links work).
- [ ] `/assets/*` responses carry a one-year `Cache-Control`; `index.html` is `no-cache`; `X-Content-Type-Options: nosniff` is present on both.
- [ ] `http://127.0.0.1:3000/health` returns `{"status":"ok"}`, proving the API reached Postgres over the Compose network.
- [ ] Starting against an empty `portfolio-pg-data` volume applies migrations automatically; `contact_messages` and `page_events` exist without a manual command.
- [ ] Restarting `api` is a no-op for migrations (`migrate deploy` finds nothing to apply).
- [ ] `docker compose exec api whoami` prints `node`.
- [ ] The API image contains no `@nestjs/cli`, `vitest`, or `testcontainers` (`docker run --rm --entrypoint sh portfolio-api:local -c 'ls node_modules | grep -c vitest'` prints `0`).
- [ ] Umami still answers on `/api/heartbeat` and retains its data across `down`/`up`.
- [ ] No image contains an `.env` file or any value from `infra/.env` other than the intentionally public `VITE_*` build args.
- [ ] Both images build for `linux/arm64`.
- [ ] All published host ports are bound to `127.0.0.1` (`docker compose ps` shows no `0.0.0.0` bindings).
- [ ] `infra/docker-compose.umami.yml` is deleted and `docker compose up -d postgres umami` replaces it.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` still pass on the host.

## 8. Testing architecture

Phase 4 adds infrastructure, not application code, so it adds **no unit tests**. Verification is a container-level smoke test:

- **Static serving:** `/healthz` returns 200; `/` returns HTML; a deep link returns 200 rather than nginx's 404.
- **API + DB wiring:** `/health` reports `ok` — the only assertion that proves DNS, credentials, and the Prisma client all work inside the network.
- **Migration convergence:** drop the volume (`docker compose down -v`), bring the stack up, and confirm tables exist with no manual step. This is the one destructive test; it wipes Umami's setup too.
- **Analytics:** Umami's heartbeat still succeeds from the unified compose file.
- **Existing suites are unchanged:** the API's Testcontainers integration tests keep running on the **host** against the Docker socket. Do not try to run them inside these images — the runtime stage has no dev dependencies and no Docker client.
- **Optional E2E against the container stack:** `apps/web/playwright.config.ts` hardcodes `baseURL: "http://localhost:5173"` and starts its own dev server, so pointing Playwright at nginx needs a small change (an env override plus skipping `webServer` when it is set). Treat that as Phase 6 work, where CI runs E2E pre-deploy.

Automated `pnpm test` must stay green without the Compose stack running.

## 9. Notes & decisions

- **Debian slim, not Alpine, for the API:** Prisma ships prebuilt query engines per libc. Debian (glibc) matches the default `debian-openssl-3.0.x` target, so `schema.prisma` needs no `binaryTargets`. Alpine would require adding `binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]` and pulling `openssl` + `libc6-compat` — a smaller image for more moving parts. `openssl` is installed explicitly because the `-slim` variants omit it.
- **Hoisted `node_modules` in the builder instead of `pnpm deploy`:** pnpm's default isolated layout symlinks into `node_modules/.pnpm`, which does not survive a `COPY` between stages. `pnpm deploy` is the official answer but in pnpm 9 it needs `--legacy` (or injected workspace deps) and filters files through publish rules, which can silently drop `dist` because the root `.gitignore` lists it. Writing `node-linker=hoisted` in the build stage keeps the copy boring and predictable.
- **Why `prisma` became a runtime dependency:** the entrypoint runs `migrate deploy`, so the CLI must survive the `--prod` prune. The alternative — a one-shot `migrate` service that exits, with `api` depending on `service_completed_successfully` — is cleaner for multi-replica deployments but adds a service for a single-container setup. Revisit if the API is ever scaled beyond one replica, since concurrent `migrate deploy` runs are not safe.
- **`VITE_*` are build-time and public:** Vite string-replaces `import.meta.env.*` during `vite build`, so the API URL and Umami website ID are compiled into the bundle. Changing the domain means rebuilding the web image, not restarting it. If that becomes annoying, serve a runtime `config.json` from nginx and fetch it at boot — deliberately out of scope here.
- **Migrations on startup:** convenient and idempotent, and it means Phase 5's first `up -d` needs no manual migration step. The trade-off is that a bad migration blocks the container from starting, which is arguably the correct failure mode.
- **Health semantics:** `/health` intentionally answers 200 with `{"status":"degraded"}` when the database is unreachable, so the Docker healthcheck inspects the body. A healthcheck on status code alone would report a database-less API as healthy.
- **Loopback-only port publishing:** the tunnel makes the containers reachable without opening anything on the router, so published ports exist purely for local debugging. Phase 5 may remove them entirely.
- **`cloudflared` behind a profile:** the service is fully described now but starting it without Phase 5's `credentials.json` would crash-loop. A profile keeps `up -d` clean while leaving the config in place. Token mode (`command: tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}`) is a valid alternative that skips the credentials file; `config.yml` is used here because `MAIN_PLAN.md` specifies it and it keeps ingress rules in version control.
- **Image pinning:** `postgres:16-alpine` and `nginx:1.27-alpine` are pinned by minor. Umami is still on a floating tag from Phase 3; pin it before the Pi deploy by recording the digest that resolves today:

```bash
docker image inspect ghcr.io/umami-software/umami:postgresql-latest \
  --format '{{index .RepoDigests 0}}'
```

- **`cloudflare/cloudflared:latest`** is intentionally floating so tunnel client fixes arrive automatically; pin it too if reproducibility matters more than patch currency.
- **ARM64:** the Pi is the only production target. Building natively on the Pi is simplest but slow; Buildx with QEMU works from an x86 machine and is slower still for the Vite and Nest builds. Phase 6 moves this to CI with a registry, which is where cross-building belongs.
- **nginx runs its master process as root** to bind port 80, dropping to `nginx` for workers. Switching to `nginxinc/nginx-unprivileged` (listening on 8080) is a Phase 6 hardening option, not a Phase 4 requirement.
- **`docker compose down -v` destroys Umami's account and websites** along with the app database, since both live in the shared `portfolio-pg-data` volume. Use plain `down` unless a fresh-migration test is the point.
