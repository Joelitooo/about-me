# Phase 4 - Dockerization (`infra`)

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. Technical details live in [`spec.md`](spec.md).

**Goal:** turn the working local monorepo into a reproducible container stack — a multi-stage build that serves `apps/web` as static files from nginx, a multi-stage Node build that runs `apps/api` with migrations applied on startup, and one `docker-compose.yml` describing `web`, `api`, `postgres`, `umami`, and `cloudflared` — all buildable for ARM64 so Phase 5 can deploy it to the Pi unchanged.

## Prerequisites

- Phases 0–3 complete: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm -r build` all pass locally.
- Docker with Compose v2 and Buildx available.
- `infra/.env` already holds a real `POSTGRES_PASSWORD` + `APP_SECRET` from Phase 3, and `infra/postgres/init.sql` exists.
- The domain is decided (used for `CORS_ORIGIN` and the `VITE_*` build args), even if DNS is not wired up until Phase 5.

## Steps

1. **`.dockerignore`** — add a root `.dockerignore` so `node_modules`, `dist`, and every `.env` stay out of the build context. Both images build from the **repo root** context, because the workspace needs `pnpm-lock.yaml` and `packages/shared`.
2. **`infra/web.Dockerfile`** — Node builder installs with `--frozen-lockfile`, runs `vite build`, and copies `apps/web/dist` into an `nginx:alpine` stage. The `VITE_*` values are **build args**, not runtime env, because Vite inlines them at build time.
3. **`infra/nginx.conf`** — SPA config: `try_files` fallback to `index.html` for client-side routes, long-lived immutable caching for `/assets`, no-cache for `index.html`, gzip, and a few security headers.
4. **`infra/api.Dockerfile`** — Node builder runs `prisma generate` then `nest build`, and `pnpm deploy` produces a self-contained app directory copied into a slim runtime stage that runs as the non-root `node` user.
5. **`infra/api-entrypoint.sh`** — run `prisma migrate deploy` (idempotent) before `exec node dist/main.js`, so a fresh volume converges on the current schema without a manual step.
6. **`infra/docker-compose.yml`** — one file describing `web`, `api`, `postgres`, `umami`, and `cloudflared`. It absorbs the Phase 3 `docker-compose.umami.yml`, which then goes away. Host ports bind to loopback only; `cloudflared` sits behind a `tunnel` profile so the stack is testable before the tunnel exists.
7. **`infra/cloudflared/config.yml`** — ingress skeleton mapping the apex, `api.`, and `analytics.` hostnames to the `web`, `api`, and `umami` services. Creating the tunnel, its credentials, and DNS records is Phase 5.
8. **Env surface** — extend `infra/.env.example` with the deployment knobs (`DOMAIN`, `CORS_ORIGIN`, `VITE_*`, port bindings, `TUNNEL_TOKEN`) and keep real values in gitignored `infra/.env`.
9. **Verify** — build both images, bring the stack up without the tunnel profile, and confirm nginx serves the SPA, deep links resolve, `/health` reports `ok` (proving the API reached Postgres through the Compose network), and Umami still answers.
10. **Handoff to Phase 5** — leave tunnel creation, DNS, and Pi provisioning alone; Phase 4 only has to produce ARM64-capable images and a compose file that Phase 5 can `up -d`.

## Deliverables

```
.dockerignore                    # new, repo root

infra/
  web.Dockerfile
  api.Dockerfile
  api-entrypoint.sh
  nginx.conf
  docker-compose.yml             # replaces docker-compose.umami.yml
  .env.example                   # + deployment vars
  cloudflared/
    config.yml
  postgres/
    init.sql                     # unchanged, from Phase 3
```

## Done when

`docker compose -f infra/docker-compose.yml build` produces `web` and `api` images for the host architecture (and for `linux/arm64` via Buildx); `docker compose up -d` brings `postgres`, `api`, `web`, and `umami` to healthy; the SPA loads from nginx with deep links working; `/health` returns `{"status":"ok"}`; migrations are applied automatically against a fresh Postgres volume; the API runs as a non-root user; and no secret or `.env` file is baked into any image.

## Task checklist

- [ ] Root `.dockerignore` excludes `node_modules`, build output, and `.env` files
- [ ] `infra/web.Dockerfile` builds the SPA and serves it from nginx
- [ ] `VITE_API_URL` / `VITE_UMAMI_*` passed as build args and visibly present in the built bundle
- [ ] `infra/nginx.conf` serves deep links via `index.html` fallback and caches `/assets` immutably
- [ ] `infra/api.Dockerfile` builds a self-contained runtime image running as `node`
- [ ] `infra/api-entrypoint.sh` applies `prisma migrate deploy` before starting the server
- [ ] `infra/docker-compose.yml` defines `web`, `api`, `postgres`, `umami`, `cloudflared` with healthchecks
- [ ] `docker-compose.umami.yml` removed; `docker compose up postgres umami` covers the Phase 3 dev flow
- [ ] `infra/cloudflared/config.yml` ingress skeleton in place, behind the `tunnel` profile
- [ ] `infra/.env.example` documents every new variable; real values only in gitignored `infra/.env`
- [ ] Smoke test passes: SPA loads, deep link resolves, `/health` is `ok`, Umami heartbeat succeeds
- [ ] Both images build for `linux/arm64`
- [ ] `pnpm typecheck` / `lint` / `test` still pass and the work is committed on `feature/phase-4`
