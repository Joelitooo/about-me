# Phase 2 - Backend API (`apps/api`)

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. Technical details live in [`spec.md`](spec.md).

**Goal:** a production-ready NestJS API with Prisma + PostgreSQL, config/validation/helmet/rate limiting, `Health` and `Contact` modules, an initial migration (`ContactMessage` + `PageEvent`), structured logging, and a Vitest testing layer (unit + Supertest HTTP + Testcontainers DB).

## Prerequisites

- Phase 0 complete: pnpm monorepo, `packages/shared`, root Vitest workspace, ESLint/Prettier baseline.
- Phase 1 complete (or in progress): `apps/web` contact form posts `ContactMessageDto` to `POST /contact` via `VITE_API_URL` (default `http://localhost:3000`).
- Docker available locally (needed for Testcontainers PostgreSQL in integration tests).
- A local PostgreSQL instance **or** Docker Postgres for `pnpm --filter @portfolio/api dev` (Testcontainers only covers tests).

## Steps

1. **Scaffold `apps/api`** — NestJS app package (`@portfolio/api`) with TypeScript, workspace dependency on `@portfolio/shared`, scripts for `dev` / `build` / `typecheck` / `test`, and Nest-specific `tsconfig` overrides (decorators, CommonJS/`Node` resolution as needed).
2. **Dependencies** — `@nestjs/config`, Prisma (`prisma` + `@prisma/client`), `class-validator` / `class-transformer`, `helmet`, `@nestjs/throttler` (rate limiting), and logging (Nest built-in logger is fine; keep structured JSON-friendly logs). Dev: `supertest`, `@testcontainers/postgresql`, Vitest types / Nest testing utilities as needed.
3. **Config & bootstrap** — `ConfigModule` for `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, etc.; global `ValidationPipe`; Helmet middleware; Throttler guard; CORS for the web origin; structured logging.
4. **Prisma** — schema with `ContactMessage` and `PageEvent`; generate client; first migration; Nest `PrismaModule` / `PrismaService` (connect on module init, disconnect on destroy).
5. **`HealthModule`** — `GET /health` returning `@portfolio/shared` `HealthStatus` (and optionally a DB ping for `degraded`/`ok`).
6. **`ContactModule`** — `POST /contact` validating body against `ContactMessageDto` shape via a class-validator DTO; persist via Prisma; return `201` (empty or minimal body matching the web client).
7. **Testing** — register `apps/api` in root `vitest.workspace.ts` (`node` env). Unit tests for services/controllers; HTTP integration tests with Supertest against the booted Nest app; DB-backed tests with Testcontainers (ephemeral PostgreSQL). Per-app coverage thresholds (reasonable floor; CI enforces later in Phase 6).
8. **Verify** — `pnpm install`, migrate against local DB, `pnpm --filter @portfolio/api dev`, hit `/health` and `/contact`, then `pnpm typecheck` / `lint` / `test` / `build`, and commit.

## Deliverables

```
apps/api/
  prisma/
    schema.prisma
    migrations/
      <timestamp>_init/
        migration.sql
  src/
    main.ts
    app.module.ts
    prisma/
      prisma.module.ts
      prisma.service.ts
    health/
      health.module.ts
      health.controller.ts
      health.service.ts
      health.controller.test.ts   # or co-located *.test.ts
    contact/
      contact.module.ts
      contact.controller.ts
      contact.service.ts
      dto/
        create-contact-message.dto.ts
      contact.service.test.ts
    common/                       # optional: filters, logger helpers
  test/
    app.e2e-spec.ts               # Supertest (+ Testcontainers as needed)
    setup.ts                      # optional shared test helpers
  .env.example
  package.json
  tsconfig.json
  tsconfig.build.json
  nest-cli.json
  vitest.config.ts                # optional if workspace entry is enough
```

Also update root `vitest.workspace.ts` to append the `api` project.

## Done when

`pnpm --filter @portfolio/api dev` serves the API on port 3000; `GET /health` returns `HealthStatus`; `POST /contact` validates and persists a message; CORS allows the web origin; `pnpm typecheck` / `pnpm lint` / `pnpm test` pass (including API unit + integration/Testcontainers tests); `pnpm --filter @portfolio/api build` succeeds; and the contact form in `apps/web` can successfully submit against the running API.

## Task checklist

- [ ] `apps/api` NestJS package scaffolded (`@portfolio/api`) with Nest tsconfig overrides
- [ ] Dependencies: config, Prisma, validation, helmet, throttler, shared workspace package
- [ ] ConfigModule + global ValidationPipe + Helmet + rate limiting + CORS
- [ ] Prisma schema (`ContactMessage`, `PageEvent`) + first migration + `PrismaService`
- [ ] `HealthModule` — `GET /health`
- [ ] `ContactModule` — `POST /contact` (validated, persisted)
- [ ] Vitest workspace updated; unit + Supertest + Testcontainers tests pass
- [ ] `.env.example` documented; local migrate + `dev` verified
- [ ] `pnpm typecheck` / `lint` / `test` / `build` pass and committed
