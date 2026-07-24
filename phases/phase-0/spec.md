# Phase 0 - Technical Specification

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. High-level overview in [`plan.md`](plan.md).

This document is the implementation contract for Phase 0. Follow top-to-bottom. Do not add application code (React/NestJS) in this phase.

## 1. Scope

**In scope:** pnpm workspace skeleton, shared TS/ESLint/Prettier baseline, `packages/shared`, repo hygiene, initial git history.

**Out of scope:** `apps/web`, `apps/api`, Docker, DB, analytics, deployment, CI.

## 2. Conventions

- Package manager: pnpm via Corepack
- TypeScript strict ESM
- Packages scoped `@portfolio/*`; alias `@shared/*`
- Node LTS v22 pinned in `.nvmrc`

## 3. Prerequisites

Node v20+, Corepack enabled (`corepack enable`).

## 4. Target file tree

See plan.md deliverables section.

## 5. File-by-file specification

See committed files in this branch for exact contents: root tooling, `packages/shared`, Vitest workspace, README.

## 6. Execution order

1. Enable pnpm via Corepack
2. Create files from spec
3. `git init`
4. `pnpm install`
5. `pnpm typecheck && pnpm lint && pnpm test && pnpm format:check`
6. Initial commit

## 7. Acceptance criteria

- `pnpm install` produces lockfile
- typecheck, lint, test, format:check pass
- `@portfolio/shared` exports shared contracts
- no app code yet

## 8. Testing architecture

Vitest repo-wide; RTL/jsdom in Phase 1; Supertest + Testcontainers in Phase 2; Playwright E2E later.

## 9. Notes

ESLint 9 flat config; shared package consumed from source during development.
