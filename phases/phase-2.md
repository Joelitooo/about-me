# Phase 2 - Backend API (`apps/api`)

> Part of the [Portfolio Fullstack Monorepo](../MAIN_PLAN.md) plan.

- Scaffold NestJS; add `@nestjs/config`, Prisma, `class-validator`/`class-transformer`, `helmet`, and rate limiting.
- Prisma schema + first migration for initial tables: `ContactMessage` (contact form) and a lightweight `PageEvent` (optional custom tracking alongside Umami).
- Modules: `HealthModule` (`/health`), `ContactModule` (`POST /contact`, validated), CORS configured for the web origin.
- Structured logging and a global validation pipe.
- **Testing:** register `apps/api` in the root Vitest workspace (`node` env). Unit tests for services/controllers; HTTP integration tests with Supertest against the booted Nest app; DB-backed integration tests using Testcontainers (ephemeral PostgreSQL) against Prisma. Per-app coverage thresholds.
