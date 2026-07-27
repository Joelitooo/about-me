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
- Docker (local Postgres for API `dev`, Testcontainers for API tests)

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
