# Phase 4 - Dockerization (`infra`)

> Part of the [Portfolio Fullstack Monorepo](../MAIN_PLAN.md) plan.

- `web.Dockerfile`: multi-stage build -> static files served by nginx.
- `api.Dockerfile`: multi-stage Node build running NestJS (with `prisma migrate deploy` on startup).
- `docker-compose.yml`: services `web`, `api`, `postgres`, `umami`, and `cloudflared`. Use `.env` for secrets; build ARM64-compatible images.
