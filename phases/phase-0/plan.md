# Phase 0 - Repo and tooling scaffolding

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. Technical details live in [`spec.md`](spec.md).

**Goal:** a clean, installable pnpm monorepo with a shared TypeScript/lint/format baseline and an empty `packages/shared`, ready for `apps/web` and `apps/api` to be added in later phases. No app code yet.

## Prerequisites

- Node.js LTS (v20+) installed on the dev machine.
- `corepack enable` so `pnpm` is available without a manual global install.

## Steps

1. **Version & tooling pins** - add `.nvmrc` (Node version), `.editorconfig`, and set `packageManager` (pnpm) in the root `package.json` so everyone/CI uses the same versions.
2. **Git init** - `git init`, add a Node/monorepo `.gitignore` (`node_modules`, `dist`, `.env*`, build output, editor cruft), and make an initial commit.
3. **Workspace definition** - `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`.
4. **Root `package.json`** - `private: true`, workspace-wide scripts (`lint`, `format`, `typecheck`, `build`) that fan out to packages, and dev dependencies (TypeScript, ESLint, Prettier).
5. **`tsconfig.base.json`** - strict, modern shared compiler options (strict mode, `moduleResolution`, path aliases like `@shared/*`) that each package extends.
6. **ESLint + Prettier** - one shared flat ESLint config (TS + import rules) and a Prettier config, plus an `.eslintignore`/ignore globs. Wire them into the root scripts.
7. **`packages/shared`** - scaffold the package: `package.json`, `tsconfig.json` extending the base, and `src/index.ts` exporting placeholder cross-cutting types (e.g. `ContactMessageDto`, tracking event shapes) so both apps can import them later.
8. **Testing foundation** - add Vitest as the repo-wide test runner: root `vitest.workspace.ts`, `@vitest/coverage-v8`, root `test`/`test:coverage` scripts, and a first unit test in `packages/shared` to prove the setup. (Web/API testing layers are added in their own phases.)
9. **`README.md`** - project overview, stack, repo layout, and how to install/lint/typecheck/test.
10. **Verify** - run `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format` and confirm a clean pass, then commit.

## Deliverables

```
about-me/
  apps/                      # empty for now (created in Phase 1/2)
  packages/
    shared/
      src/index.ts
      src/index.test.ts
      package.json
      tsconfig.json
  .editorconfig
  .gitignore
  .nvmrc
  eslint.config.mjs
  .prettierrc(.json)
  package.json               # root, private, workspace scripts
  pnpm-workspace.yaml
  tsconfig.base.json
  vitest.workspace.ts
  README.md
```

## Done when

`pnpm install` succeeds from a clean checkout, `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass, `packages/shared` builds/exports its types, and the initial scaffold is committed to git.

## Task checklist

- [ ] `.nvmrc`, `.editorconfig`, `packageManager` pinned
- [ ] `git init` + `.gitignore` + initial commit
- [ ] `pnpm-workspace.yaml`
- [ ] Root `package.json` with workspace scripts + dev deps
- [ ] `tsconfig.base.json`
- [ ] Shared ESLint + Prettier config wired into scripts
- [ ] `packages/shared` scaffolded with placeholder types
- [ ] Vitest workspace + coverage wired; sample `shared` test passes
- [ ] `README.md`
- [ ] `pnpm install` / `typecheck` / `lint` / `test` pass and committed
