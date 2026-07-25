# Phase 0 - Technical Specification

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. High-level overview in `[plan.md](plan.md)`.

This document is the implementation contract for Phase 0. It is written for an agent (or developer) to follow top-to-bottom. Each section gives the exact file path, its full contents, and the commands to run. Do not add application code (React/NestJS) in this phase — Phase 0 only produces the monorepo skeleton and shared tooling.

---

## 1. Scope

**In scope**

- pnpm workspace monorepo skeleton (`apps/*`, `packages/*`).
- Shared TypeScript, ESLint, and Prettier baseline.
- `packages/shared` package exporting placeholder cross-cutting types.
- Repo hygiene files (`.gitignore`, `.editorconfig`, `.nvmrc`), root `README.md`, initial git history.

**Out of scope (later phases)**

- Any `apps/web` or `apps/api` source code.
- Docker, database, analytics, deployment, CI.

## 2. Conventions

- **Package manager:** pnpm (via Corepack). Never use `npm`/`yarn` in this repo.
- **Language:** TypeScript, ESM (`"type": "module"` where applicable), `strict` mode on.
- **Line endings:** LF. **Indent:** 2 spaces. **Charset:** UTF-8.
- **Node target:** current LTS (v22.x; v20.x acceptable). Pin the exact version in `.nvmrc`.
- **Naming:** workspace packages are scoped under `@portfolio/`* (e.g. `@portfolio/shared`).
- **Path alias:** `@shared/`* resolves to `packages/shared/src/*`.

## 3. Prerequisites

1. Node.js LTS installed (`node -v` → v20+; v22 recommended).
2. Enable Corepack so pnpm matches the pinned version:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v   # confirm it runs
```

## 4. Target file tree

```
about-me/
├── apps/
│   └── .gitkeep
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── index.ts
│       │   └── index.test.ts
│       ├── package.json
│       └── tsconfig.json
├── .editorconfig
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── eslint.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.workspace.ts
└── README.md
```

## 5. File-by-file specification

Create each file exactly as specified. Replace the pinned Node version if a newer LTS patch is desired, but keep it consistent across `.nvmrc` and `engines`.

### 5.1 `.nvmrc`

```
22
```

### 5.2 `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

### 5.3 `.gitignore`

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
build/
*.tsbuildinfo

# Env & secrets
.env
.env.*
!.env.example

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Editor / OS
.DS_Store
Thumbs.db
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# Coverage / caches
coverage/
.eslintcache
```

### 5.4 `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 5.5 Root `package.json`

Scripts fan out to workspaces with `pnpm -r` (recursive). Root-only tooling (ESLint/Prettier) runs at the root.

```json
{
  "name": "portfolio-monorepo",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.3.0",
    "typescript": "^5.5.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^2.0.0"
  }
}
```

> The `packageManager` field must match the pnpm version Corepack activates. Bump the pinned patch if Corepack reports a mismatch.

### 5.6 `tsconfig.base.json`

Shared strict compiler options. Every package `extends` this file.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "moduleDetection": "force",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["packages/shared/src/*"]
    }
  }
}
```

### 5.7 `eslint.config.mjs` (flat config, ESLint 9)

```js
// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/node_modules/**", "**/*.tsbuildinfo"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  prettier,
);
```

### 5.8 `.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

### 5.9 `.prettierignore`

```gitignore
node_modules
dist
build
pnpm-lock.yaml
coverage
*.tsbuildinfo
```

### 5.10 `apps/.gitkeep`

Empty file so the empty `apps/` directory is tracked by git.

```

```

### 5.11 `packages/shared/package.json`

```json
{
  "name": "@portfolio/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

> During development the package is consumed directly from `src` (TypeScript source) because both apps compile with a bundler/ts-node. A build step is still provided for typechecking and future publishing needs.

### 5.12 `packages/shared/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### 5.13 `packages/shared/src/index.ts`

Placeholder cross-cutting types shared by web and api. These are the seed contracts refined in later phases.

```ts
/**
 * Shared contracts used by both apps/web and apps/api.
 * Refined in later phases as real endpoints and events are defined.
 */

/** Payload submitted by the contact form (web) and validated by the API. */
export interface ContactMessageDto {
  name: string;
  email: string;
  message: string;
}

/** Supported UI locales. */
export type Locale = "en" | "pt" | "pl";

/** Lightweight analytics event shape (custom tracking alongside Umami). */
export interface TrackingEvent {
  name: string;
  path: string;
  timestamp: string; // ISO 8601
  locale?: Locale;
  metadata?: Record<string, string | number | boolean>;
}

/** Standard health-check response returned by the API. */
export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  uptimeSeconds: number;
}
```

### 5.14 `vitest.workspace.ts`

Repo-wide Vitest workspace. Each package/app registers as a project so `pnpm test` runs the whole suite from the root. Web and API projects are appended in their own phases.

```ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "shared",
      root: "./packages/shared",
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  },
  // Phase 1 appends: apps/web (environment: "jsdom", RTL setup)
  // Phase 2 appends: apps/api (environment: "node", Supertest/Testcontainers)
]);
```

### 5.15 `packages/shared/src/index.test.ts`

First unit test — proves the toolchain works and guards the shared contracts.

```ts
import { describe, it, expect } from "vitest";
import type { ContactMessageDto, HealthStatus } from "./index.js";

describe("shared contracts", () => {
  it("accepts a well-formed contact message", () => {
    const msg: ContactMessageDto = {
      name: "Ada",
      email: "ada@example.com",
      message: "Hello!",
    };
    expect(msg.email).toContain("@");
  });

  it("models a healthy status", () => {
    const health: HealthStatus = { status: "ok", uptimeSeconds: 1 };
    expect(health.status).toBe("ok");
  });
});
```

> Import uses the `.js` extension (TS ESM resolution) to match `verbatimModuleSyntax`. Adjust if a bundler-based resolution is configured for the package.

### 5.16 `README.md`

Root readme. Minimum required sections: project summary, stack, repo layout, prerequisites, and common commands.

```md
# Portfolio Fullstack Monorepo

Personal portfolio built as a TypeScript monorepo: a Vite + React SPA (`apps/web`),
a NestJS + Prisma + PostgreSQL API (`apps/api`), and shared types (`packages/shared`).
Self-hosted Umami analytics, containerized with Docker, deployed to a Raspberry Pi
via Cloudflare Tunnel. See `[MAIN_PLAN.md](MAIN_PLAN.md)` for the phased plan.

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

​`bash
pnpm install       # install all workspace deps
pnpm typecheck     # typecheck every package
pnpm lint          # lint the repo
pnpm test          # run the Vitest workspace
pnpm format        # format with Prettier
​`
```

> Note: remove the zero-width guard characters if copying the fenced block above; the README's own code fence is escaped here only to keep this spec's markdown valid.

## 6. Execution order (commands)

Run from the repo root (`/home/joelito/about-me`), in this order:

```bash
# 1. Version manager + pnpm
corepack enable
corepack prepare pnpm@latest --activate

# 2. Create the files from section 5 (all of them), then:

# 3. Initialize git (if not already a repo)
git init

# 4. Install dependencies (generates pnpm-lock.yaml)
pnpm install

# 5. Verify the toolchain
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check

# 6. Initial commit
git add .
git commit -m "chore: scaffold pnpm monorepo and shared tooling (phase 0)"
```

> If `pnpm install` reports a `packageManager`/Corepack version mismatch, set the root `package.json` `packageManager` field to the version that `pnpm -v` prints, then re-run.

## 7. Acceptance criteria

Phase 0 is complete when **all** of the following hold:

- [ ] `pnpm install` completes with no errors on a clean checkout and produces `pnpm-lock.yaml`.
- [ ] `pnpm typecheck` passes (0 errors) — `@portfolio/shared` typechecks.
- [ ] `pnpm lint` passes (0 errors; warnings allowed).
- [ ] `pnpm test` runs the Vitest workspace and the `shared` sample test passes.
- [ ] `pnpm test:coverage` produces a coverage report with no runner errors.
- [ ] `pnpm format:check` reports all files formatted.
- [ ] The directory tree matches section 4.
- [ ] `@portfolio/shared` exports `ContactMessageDto`, `Locale`, `TrackingEvent`, and `HealthStatus`, importable via `@shared/*`.
- [ ] Repo has an initial commit; `node_modules`, `dist`, and `.env*` are gitignored.
- [ ] No application (React/NestJS) code exists yet.

## 8. Testing architecture

Phase 0 establishes only the **foundation**; later phases add their layers on top of the same runner.

- **Runner:** Vitest is the single test runner for the entire monorepo (web, api, shared). The root `vitest.workspace.ts` aggregates per-project configs so `pnpm test` runs everything.
- **Pyramid:**
  - _Unit / component_ — Vitest in every package. `apps/web` (Phase 1) adds React Testing Library + `@testing-library/jest-dom` + `jsdom`.
  - _Integration_ — `apps/api` (Phase 2) adds Supertest (HTTP against the booted Nest app) and Testcontainers (ephemeral PostgreSQL) for DB-backed tests. Testcontainers is the confirmed approach — the project is Docker-based end to end (local, CI, and Pi), so a real containerized DB in tests keeps parity with production.
  - _E2E_ — Playwright (Phase 1/later) under `apps/web/e2e/`, run against the composed stack.
- **Coverage:** `@vitest/coverage-v8` (`pnpm test:coverage`). Thresholds are introduced per app and enforced in CI (Phase 6).
- **Conventions:** co-locate unit tests as `*.test.ts(x)` next to source; per-app integration tests in `test/`; E2E in `apps/web/e2e/`.
- **Decision:** Vitest is used even for NestJS (whose default is Jest) to keep one config/runner across the repo; Jest + Supertest is the documented fallback if Nest + Vitest friction appears.

## 9. Notes & decisions

- **ESLint flat config (v9)** is used instead of legacy `.eslintrc`; `eslint-config-prettier` is applied last to disable stylistic rules that conflict with Prettier.
- `@portfolio/shared` **is consumed from source** during development to avoid a build step in the inner loop; a `build`/`typecheck` script is still provided.
- `moduleResolution: "Bundler"` suits Vite (web) and works for the API via its own tsconfig overrides in Phase 2.
- Exact dependency versions may float within the specified ranges; the lockfile is the source of truth. Bump majors deliberately, not automatically.
