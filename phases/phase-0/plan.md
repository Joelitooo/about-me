# Phase 0 - Repo and tooling scaffolding

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. Technical details live in [`spec.md`](spec.md).

**Goal:** a clean, installable pnpm monorepo with a shared TypeScript/lint/format baseline and an empty `packages/shared`, ready for `apps/web` and `apps/api` to be added in later phases. No app code yet.

## Prerequisites

- Node.js LTS (v20+) installed on the dev machine.
- `corepack enable` so `pnpm` is available without a manual global install.

## Steps

1. **Version & tooling pins** - add `.nvmrc` (Node version), `.editorconfig`, and set `packageManager` (pnpm) in the root `package.json` so everyone/CI uses the same versions.
2. **Git init** - `git init`, add a Node/monorepo `.gitignore`, and make an initial commit.
3. **Workspace definition** - `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`.
4. **Root `package.json`** - workspace-wide scripts and dev dependencies.
5. **`tsconfig.base.json`** - strict shared compiler options.
6. **ESLint + Prettier** - shared flat ESLint config and Prettier config.
7. **`packages/shared`** - scaffold with placeholder cross-cutting types.
8. **Testing foundation** - Vitest workspace, coverage, sample shared test.
9. **`README.md`** - project overview and commands.
10. **Verify** - run install, typecheck, lint, test, format; then commit.

## Done when

`pnpm install`, `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass; initial scaffold is committed.

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
