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

- `apps/web` — React SPA (added in Phase 1)
- `apps/api` — NestJS API (added in Phase 2)
- `packages/shared` — shared TypeScript types/DTOs
- `phases/` — per-phase plans and specs

## Prerequisites

- Node.js v20+ (v22 recommended)
- Corepack enabled (`corepack enable`) for pnpm

## Commands

```bash
pnpm install       # install all workspace deps
pnpm typecheck     # typecheck every package
pnpm lint          # lint the repo
pnpm test          # run the Vitest workspace
pnpm format        # format with Prettier
```
