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

The whole stack is described by `infra/docker-compose.yml` (`web`, `api`, `postgres`, `umami`, and `cloudflared`). Copy `infra/.env.example` to `infra/.env` and fill the secrets first.

```bash
docker compose -f infra/docker-compose.yml build          # build web + api images
docker compose -f infra/docker-compose.yml up -d          # start everything but the tunnel
docker compose -f infra/docker-compose.yml ps             # check health
docker compose -f infra/docker-compose.yml logs -f api    # follow API logs
docker compose -f infra/docker-compose.yml up -d postgres umami   # just the DB + analytics
docker compose -f infra/docker-compose.yml down           # stop (volumes are kept)
```

The web image bakes `VITE_*` values at build time, so rebuild it after changing them. The API applies `prisma migrate deploy` on every start.
