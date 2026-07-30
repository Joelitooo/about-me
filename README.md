# Portfolio Fullstack Monorepo

Personal portfolio built as a TypeScript monorepo: a Vite + React SPA (`apps/web`),
a NestJS + Prisma + PostgreSQL API (`apps/api`), and shared types (`packages/shared`).
Self-hosted Umami analytics, containerized with Docker, deployed to a Raspberry Pi
via Cloudflare Tunnel. See [`MAIN_PLAN.md`](MAIN_PLAN.md) for the phased plan.

## Stack

- pnpm workspaces, TypeScript (strict), ESLint 9 (flat config) + Prettier
- Web: Vite, React, Tailwind, react-router, i18next, TanStack Query
- API: NestJS, Prisma, PostgreSQL
- Infra: Docker Compose, Cloudflare Tunnel

## Repo layout

- `apps/web` — React SPA (Tailwind, i18n, dark mode, sections)
- `apps/api` — NestJS API (Prisma, Health + Contact)
- `packages/shared` — shared TypeScript types/DTOs
- `phases/` — per-phase plans and specs

## Prerequisites

- Node.js v20+ (v22 recommended)
- Corepack enabled (`corepack enable`) for pnpm
- Docker with Compose v2 and Buildx (local Postgres for API `dev`, Testcontainers for API tests, full stack via `infra/docker-compose.yml`)

## Commands

```bash
pnpm dev                              # start the web dev server (http://localhost:5173)
pnpm --filter @portfolio/api dev      # start the API (http://localhost:3000)
pnpm install                          # install all workspace deps
pnpm typecheck                        # typecheck every package
pnpm lint                             # lint the repo
pnpm test                             # run the Vitest workspace
pnpm format                           # format with Prettier
```

## Docker

The whole stack is described by `infra/docker-compose.yml` (`web`, `api`, `postgres`, `umami`, `cloudflared`, and Uptime Kuma). Copy `infra/.env.example` to `infra/.env` and fill the secrets first.

```bash
docker compose -f infra/docker-compose.yml build          # build web + api images
docker compose -f infra/docker-compose.yml up -d          # start everything but the tunnel
docker compose -f infra/docker-compose.yml ps             # check health
docker compose -f infra/docker-compose.yml logs -f api    # follow API logs
docker compose -f infra/docker-compose.yml up -d postgres umami   # just the DB + analytics
docker compose -f infra/docker-compose.yml down           # stop (volumes are kept)
```

The web image bakes `VITE_*` values at build time, so rebuild it after changing them. The API applies `prisma migrate deploy` on every start.

## Deployment

The stack runs on a Raspberry Pi (Ubuntu Server 24.04, arm64) and is published through a Cloudflare Tunnel — no router port is forwarded. `infra/cloudflared/config.yml` maps each hostname to a Compose service; `infra/cloudflared/credentials.json` is a secret and is gitignored.

```bash
docker compose -f infra/docker-compose.yml build web   # after changing any VITE_* value
docker compose -f infra/docker-compose.yml up -d       # production enables tunnel and monitoring profiles
docker compose -f infra/docker-compose.yml logs -f cloudflared
cloudflared tunnel info portfolio                      # connector status
sudo systemctl list-timers portfolio-pg-backup.timer   # nightly database dump
```

Full setup — Cloudflare account, tunnel creation, DNS, host hardening, backups — is in [`phases/phase-5/spec.md`](phases/phase-5/spec.md).

## CI/CD and operations

Pull requests run a frozen pnpm install, formatting, lint, type checking, and
coverage-enabled Vitest. Run the same gates locally with:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
```

After a merge to `main`, GitHub-hosted runners repeat the quality gates, run
Playwright through an ephemeral Compose/nginx stack, and publish API and web
images for `linux/arm64`. Images are tagged with the full commit SHA; `latest`
is never used as a deployment input. The protected `production` environment
holds `VITE_UMAMI_WEBSITE_ID` and any required deployment approval.

Only the final deployment job targets the Pi's
`[self-hosted, linux, ARM64, portfolio-pi]` runner. Pull-request code never runs
there because Docker access on that host is effectively privileged. The runner
connects outbound to GitHub; CI/CD does not require an inbound router port or a
public SSH service.

Inspect the deployed image references on the Pi:

```bash
docker inspect portfolio-api --format '{{.Config.Image}}'
docker inspect portfolio-web --format '{{.Config.Image}}'
```

For a manual rollback, dispatch the Deploy workflow from `main` with a
previously published full SHA. An operator can also run
`infra/scripts/deploy.sh <full-sha>` from a trusted `main` checkout after
logging in to GHCR. The script restores both previous images automatically if
container or local endpoint health checks fail.

Uptime Kuma stores its configuration in the `portfolio-kuma-data` volume and
listens only on `127.0.0.1:3002`. Open it locally on the Pi or use an
authenticated LAN-only SSH forward:

```bash
ssh -L 3002:127.0.0.1:3002 <pi-lan-host>
```

Configure 60-second checks with three retries for:

- `https://joelitoo.com/healthz` with keyword `ok`
- `https://api.joelitoo.com/health` with keyword `"status":"ok"`
- `https://analytics.joelitoo.com/api/heartbeat`

Configure at least one outbound notification and run Kuma's built-in test.
Because Kuma runs on the Pi, it cannot report a total Pi power or network
failure.

Nightly Postgres dumps remain in `/var/backups/portfolio`. A successful local
dump starts the separate off-site service, which validates the gzip before
copying it to the destination configured in
`/etc/default/portfolio-pg-backup-offsite`. Verify a remote copy rather than
trusting its filename:

```bash
gzip -t pg_dumpall-<timestamp>.sql.gz
gzip -dc pg_dumpall-<timestamp>.sql.gz | grep -E 'CREATE DATABASE|contact_messages'
```

Full setup — runner registration, workflow behavior, rollback drills,
monitoring verification, and off-site restore testing — is in
[`phases/phase-6/spec.md`](phases/phase-6/spec.md).
