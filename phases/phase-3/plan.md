# Phase 3 - Analytics (Umami)

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. Technical details live in [`spec.md`](spec.md).

**Goal:** run self-hosted Umami against its own database on a shared Postgres instance, create a website in the Umami dashboard, and wire a privacy-friendly tracking script into `apps/web` so pageviews/sessions show up locally.

## Prerequisites

- Phase 0–2 complete (or far enough that `apps/web` and `apps/api` exist and Postgres is understood).
- Docker available locally (Umami + Postgres run as containers).
- Phase 1 `apps/web` env pattern (`VITE_*`, `.env.example`, `vite-env.d.ts`) in place.

## Steps

1. **`infra/` starter** — add `infra/postgres/init.sql` that creates both the `portfolio` (app) and `umami` databases on one Postgres instance, matching the MAIN_PLAN “single Postgres, two DBs” decision.
2. **Dev Compose for analytics** — add `infra/docker-compose.umami.yml` with `postgres` + `umami` only (not the full stack). Pin an ARM64-friendly Umami image; expose Umami on **port 3001** so it does not clash with the Nest API on 3000.
3. **Env / secrets** — add `infra/.env.example` with empty `POSTGRES_PASSWORD` / `APP_SECRET`; generate both via `openssl rand -hex` into gitignored `infra/.env`. Compose must require them (no `portfolio` password fallback). Sync the same Postgres password into `apps/api/.env` `DATABASE_URL`.
4. **Website in Umami** — start the stack, log in, change the default password, add a website (local origin), copy the website ID.
5. **Tracking in `apps/web`** — add `VITE_UMAMI_URL` + `VITE_UMAMI_WEBSITE_ID`; load the Umami script only when both are set (no-op in CI / fresh clones). Prefer a small React component so SPA loads stay conditional and testable.
6. **Verify** — open the SPA, navigate, confirm a pageview in the Umami dashboard; keep `pnpm typecheck` / `lint` / `test` / `build` green.
7. **Handoff to Phase 4** — leave full `web` / `api` / `cloudflared` Compose and production Dockerfiles for Phase 4; Phase 3 only seeds the Postgres init + Umami service shape they will absorb.

## Deliverables

```
infra/
  postgres/
    init.sql
  docker-compose.umami.yml
  .env.example

apps/web/
  .env.example                 # + VITE_UMAMI_*
  src/
    vite-env.d.ts              # + VITE_UMAMI_*
    components/
      UmamiAnalytics.tsx
      UmamiAnalytics.test.tsx
    main.tsx                   # mount UmamiAnalytics
```

## Done when

`docker compose -f infra/docker-compose.umami.yml up -d` serves Umami on `http://localhost:3001`; a website exists in the dashboard; with `VITE_UMAMI_*` set, `apps/web` loads `/script.js` with the correct `data-website-id`; browsing the SPA records at least one pageview; and `pnpm typecheck` / `lint` / `test` / `build` still pass without requiring Umami to be running.

## Task checklist

- [ ] `infra/postgres/init.sql` creates `portfolio` + `umami` databases
- [ ] `infra/docker-compose.umami.yml` runs Postgres + Umami (Umami on :3001)
- [ ] `infra/.env.example` documents keys; real `POSTGRES_PASSWORD` + `APP_SECRET` generated into `infra/.env`
- [ ] Compose requires both secrets; `apps/api` `DATABASE_URL` matches Postgres password
- [ ] Umami dashboard: default password changed; website created; website ID copied
- [ ] `VITE_UMAMI_URL` + `VITE_UMAMI_WEBSITE_ID` in web `.env.example` + `vite-env.d.ts`
- [ ] `UmamiAnalytics` loads the script only when both env vars are set
- [ ] Unit test covers “no script when unset”
- [ ] Manual: SPA pageview appears in Umami
- [ ] `pnpm typecheck` / `lint` / `test` / `build` pass and committed
