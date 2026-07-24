# Phase 6 - CI/CD and hardening (next iteration)

> Part of the [Portfolio Fullstack Monorepo](../MAIN_PLAN.md) plan.

- GitHub Actions: run `pnpm lint`, `pnpm typecheck`, and `pnpm test` on every PR; run Playwright E2E pre-deploy; build/push ARM64 images and auto-deploy to the Pi.
- Add Uptime Kuma monitoring, security headers review, and later the auth layer once forms + DB are solid.
