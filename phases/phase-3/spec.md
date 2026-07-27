# Phase 3 - Technical Specification

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. High-level overview in [`plan.md`](plan.md).

This document is the implementation contract for Phase 3. It is written for an agent (or developer) to follow top-to-bottom. Each section gives the exact file path, its full contents (for config/infra) or representative skeleton (for React), and the commands to run. Phase 3 **seeds `infra/` for analytics only** and wires tracking into the existing `apps/web` — it does **not** Dockerize web/api or add Cloudflare Tunnel (Phase 4–5).

---

## 1. Scope

**In scope**

- Create `infra/postgres/init.sql` so one Postgres instance hosts both `portfolio` (app) and `umami` databases.
- Create `infra/docker-compose.umami.yml` with services `postgres` + `umami` for local analytics.
- Document env vars / first-login steps; create a website in the Umami UI and obtain a website ID.
- Add conditional Umami tracking to `apps/web` via `VITE_UMAMI_URL` and `VITE_UMAMI_WEBSITE_ID`.
- Unit test that the tracker does not inject a script when env vars are missing.

**Out of scope (later phases)**

- `web.Dockerfile`, `api.Dockerfile`, full `docker-compose.yml` with `web` / `api` / `cloudflared` (Phase 4).
- Cloudflare Tunnel hostname `analytics.*` (Phase 5).
- CI coverage gates / deploy pipelines (Phase 6).
- Custom Nest `PageEvent` ingestion API (optional later; schema already exists from Phase 2).
- Ad-blocker evasion (`TRACKER_SCRIPT_NAME` / renamed collect endpoint) — nice-to-have; not required here.
- Session replay / heatmaps / Umami Cloud — self-hosted pageviews/sessions only.

## 2. Conventions

- **Package manager:** pnpm (via Corepack). Never use `npm`/`yarn` in this repo.
- **Language:** TypeScript, ESM for `apps/web`, `strict` mode on.
- **Imports:** use `.js` extension in TypeScript import specifiers (matches `verbatimModuleSyntax`).
- **Env vars (web):** prefixed with `VITE_` and declared in `apps/web/src/vite-env.d.ts`.
- **Umami local URL:** `http://localhost:3001` (Nest API keeps `http://localhost:3000`).
- **Compose file location:** under `infra/`; Phase 4 will absorb Umami into the production compose.
- **Secrets:** never commit real `POSTGRES_PASSWORD`, `APP_SECRET`, or production passwords. Generate with `openssl rand -hex`, store in gitignored `infra/.env` (and mirror the DB password into `apps/api/.env`).
- **Tests:** co-locate as `*.test.tsx` next to the component.

## 3. Prerequisites

1. Phases 0–2 complete enough that:
   - `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` pass at the repo root.
   - `apps/web` exists with `.env.example`, `vite-env.d.ts`, and `main.tsx`.
2. Docker daemon running.
3. If a Phase 2 `portfolio-pg` container is still running on port 5432, **stop/remove it** before bringing up the Phase 3 compose (same host port). Migrate any local data you care about, or accept a fresh DB and re-run `prisma migrate` against the new Postgres.
4. Create a feature branch before making any changes:

```bash
git checkout -b feature/phase-3
```

All Phase 3 work happens on this branch. Do not commit directly to `main`.

## 4. Target file tree

```
about-me/
├── infra/
│   ├── .env.example
│   ├── docker-compose.umami.yml
│   └── postgres/
│       └── init.sql
├── apps/
│   └── web/
│       ├── .env.example                    # updated
│       └── src/
│           ├── vite-env.d.ts               # updated
│           ├── main.tsx                    # updated
│           └── components/
│               ├── UmamiAnalytics.tsx      # new
│               └── UmamiAnalytics.test.tsx # new
└── phases/
    └── phase-3/
        ├── plan.md
        └── spec.md
```

No new pnpm packages. No changes required to `apps/api` for Umami (Umami owns its own schema via its container `init`).

## 5. File-by-file specification

### 5.1 `infra/postgres/init.sql`

Runs only on **first** Postgres data-volume init (Docker skips `docker-entrypoint-initdb.d` after the volume already has data). The image’s `POSTGRES_USER` / `POSTGRES_DB` already create the `portfolio` role + DB; this script adds `umami`. Umami connects with the same credentials to that dedicated database (Phase 4 may introduce a dedicated role).

```sql
-- Creates the Umami database alongside POSTGRES_DB=portfolio (created by the image).
CREATE DATABASE umami;
```

For a one-off manual `psql` on an already-initialized volume, create the DB yourself if missing:

```bash
docker exec -it portfolio-pg psql -U portfolio -c 'CREATE DATABASE umami;'
```

### 5.2 `infra/.env.example`

Do **not** ship weak defaults like `portfolio`/`portfolio`. `.env.example` documents keys and how to generate values; real secrets live only in gitignored `infra/.env`.

```env
# Shared Postgres (also used by apps/api via localhost:5432)
POSTGRES_USER=portfolio
POSTGRES_DB=portfolio
# URL-safe secret — generate: openssl rand -hex 24
POSTGRES_PASSWORD=

# Umami session/signing secret (min ~32 chars) — generate: openssl rand -hex 32
APP_SECRET=

UMAMI_PORT=3001
```

Copy and fill secrets before `docker compose up`:

```bash
cp infra/.env.example infra/.env
# macOS/Linux:
sed -i.bak \
  -e "s/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" \
  -e "s/^APP_SECRET=$/APP_SECRET=$(openssl rand -hex 32)/" \
  infra/.env && rm -f infra/.env.bak
```

Or edit `infra/.env` by hand and paste the two `openssl` outputs. Hex is intentional so the password is safe inside `DATABASE_URL` without URL-encoding.

Ensure `infra/.env` is covered by the root `.gitignore` (`.env` / `.env*` patterns from Phase 0). If root ignore is only `.env`, add `infra/.env` explicitly or rely on `**/.env` — verify before committing.

**Sync with the API:** after setting `POSTGRES_PASSWORD`, update `apps/api/.env` so Prisma uses the same password:

```env
DATABASE_URL=postgresql://portfolio:<POSTGRES_PASSWORD>@localhost:5432/portfolio?schema=public
```

### 5.3 `infra/docker-compose.umami.yml`

Dev-only analytics stack. Phase 4 will fold these services into the full compose.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: portfolio-pg
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-portfolio}
      # Required — no weak default. Compose fails fast if missing/empty.
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in infra/.env}
      POSTGRES_DB: ${POSTGRES_DB:-portfolio}
    volumes:
      - portfolio-pg-data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/01-umami.sql:ro
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${POSTGRES_USER:-portfolio} -d ${POSTGRES_DB:-portfolio}",
        ]
      interval: 5s
      timeout: 5s
      retries: 10

  umami:
    # Multi-arch image (amd64/arm64) suitable for Pi later.
    # Pin a digest or semver tag in Phase 4 for reproducibility; latest is fine for Phase 3 learning.
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: portfolio-umami
    restart: unless-stopped
    ports:
      - "${UMAMI_PORT:-3001}:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-portfolio}:${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in infra/.env}@postgres:5432/umami
      APP_SECRET: ${APP_SECRET:?Set APP_SECRET in infra/.env}
      DISABLE_TELEMETRY: "1"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/heartbeat || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s

volumes:
  portfolio-pg-data:
```

**Notes**

- Container name `portfolio-pg` matches Phase 2 docs. The **password does not** — Phase 2’s `portfolio`/`portfolio` one-off is replaced. Point `apps/api/.env` `DATABASE_URL` at the same `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` from `infra/.env`.
- `${VAR:?message}` makes Compose refuse to start if `POSTGRES_PASSWORD` or `APP_SECRET` is unset or empty (no silent fallback to `portfolio`).
- Umami’s first boot migrates its own tables into the `umami` database — do **not** put Umami tables in Prisma.
- If `postgresql-latest` fails to pull or is deprecated, fall back to `ghcr.io/umami-software/umami:latest` or a pinned tag such as `3.2.0` and note the choice in the PR.

### 5.4 Bring-up & dashboard (manual, required)

```bash
cd /home/joelito/about-me
cp infra/.env.example infra/.env
# Fill both secrets (required by Compose):
#   POSTGRES_PASSWORD=$(openssl rand -hex 24)
#   APP_SECRET=$(openssl rand -hex 32)
# Or use the sed one-liner from section 5.2.

# Stop the Phase 2 one-off container if it still holds :5432
docker rm -f portfolio-pg 2>/dev/null || true

docker compose -f infra/docker-compose.umami.yml --env-file infra/.env up -d
docker compose -f infra/docker-compose.umami.yml ps
# wait until umami is healthy
curl -sf http://localhost:3001/api/heartbeat

# Sync API connection string to the new Postgres password (section 5.10)
```

Then in a browser:

1. Open `http://localhost:3001`.
2. Log in with default credentials **`admin` / `umami`** (Umami creates this on first migrate).
3. **Change the password immediately** (Settings → Profile).
4. Settings → Websites → Add website:
   - Name: `Portfolio` (or similar)
   - Domain: `localhost` (dev)
5. Copy the **Website ID** (UUID) from the tracking snippet.

Keep the website ID for `apps/web/.env` — do not commit it if you treat local IDs as private; committing a local-only UUID in `.env.example` as a placeholder comment is fine (`your-website-id`).

### 5.5 `apps/web/.env.example` (update)

```env
VITE_API_URL=http://localhost:3000

# Umami (Phase 3). Leave blank to disable analytics locally / in CI.
VITE_UMAMI_URL=http://localhost:3001
VITE_UMAMI_WEBSITE_ID=
```

Developers copy to `apps/web/.env` and paste the real website ID.

### 5.6 `apps/web/src/vite-env.d.ts` (update)

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_UMAMI_URL?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 5.7 `apps/web/src/components/UmamiAnalytics.tsx`

Conditionally inject Umami’s script. Skip entirely when URL or website ID is missing so `pnpm test` / CI do not need Umami.

```tsx
import { useEffect } from "react";

const SCRIPT_DATASET_FLAG = "umamiPortfolio";

/**
 * Loads the self-hosted Umami tracker when VITE_UMAMI_URL and
 * VITE_UMAMI_WEBSITE_ID are both set. No-op otherwise.
 *
 * Umami's script listens to History API changes, so React Router
 * navigations are recorded as pageviews without extra wiring.
 */
export function UmamiAnalytics() {
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_UMAMI_URL?.replace(/\/$/, "");
    const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;

    if (!baseUrl || !websiteId) {
      return;
    }

    if (document.querySelector(`script[${SCRIPT_DATASET_FLAG}]`)) {
      return;
    }

    const script = document.createElement("script");
    script.defer = true;
    script.src = `${baseUrl}/script.js`;
    script.dataset.websiteId = websiteId;
    script.setAttribute(SCRIPT_DATASET_FLAG, "true");
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
```

**Attribute note:** Umami expects `data-website-id` on the script tag. Setting `script.dataset.websiteId` produces that attribute in the DOM.

### 5.8 `apps/web/src/components/UmamiAnalytics.test.tsx`

```tsx
import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UmamiAnalytics } from "./UmamiAnalytics.js";

describe("UmamiAnalytics", () => {
  afterEach(() => {
    document.head.querySelectorAll("script[umamiPortfolio]").forEach((el) => el.remove());
    vi.unstubAllEnvs();
  });

  it("does not inject a script when env vars are missing", () => {
    vi.stubEnv("VITE_UMAMI_URL", "");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "");

    render(<UmamiAnalytics />);

    expect(document.querySelector("script[umamiPortfolio]")).toBeNull();
  });

  it("injects the Umami script when both env vars are set", async () => {
    vi.stubEnv("VITE_UMAMI_URL", "http://localhost:3001");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "11111111-1111-1111-1111-111111111111");

    render(<UmamiAnalytics />);

    await waitFor(() => {
      const script = document.querySelector("script[umamiPortfolio]");
      expect(script).not.toBeNull();
      expect(script?.getAttribute("src")).toBe("http://localhost:3001/script.js");
      expect(script?.getAttribute("data-website-id")).toBe(
        "11111111-1111-1111-1111-111111111111",
      );
    });
  });
});
```

If `vi.stubEnv` is unavailable or unreliable with the current Vitest version, read env via a tiny helper (`getUmamiConfig()`) and mock that helper instead — keep the same behavioral coverage.

### 5.9 `apps/web/src/main.tsx` (update)

Mount the component once at the app root (inside providers is fine; it renders `null`).

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import { UmamiAnalytics } from "./components/UmamiAnalytics.js";
import "./i18n/config.js";
import "./index.css";
import { queryClient } from "./lib/queryClient.js";
import { router } from "./router.js";
import { ThemeProvider } from "./theme/ThemeProvider.js";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UmamiAnalytics />
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

Do **not** hard-code the script in `index.html` — that cannot cleanly no-op when env vars are empty and is harder to unit test.

### 5.10 API `.env` reminder (update password)

After switching to Compose Postgres, `apps/api/.env` must use the **same** `POSTGRES_PASSWORD` as `infra/.env` (Phase 2’s `portfolio` password is obsolete):

```env
DATABASE_URL=postgresql://portfolio:<POSTGRES_PASSWORD>@localhost:5432/portfolio?schema=public
```

Then migrate if the volume is new:

```bash
pnpm --filter @portfolio/api prisma:migrate
```

Optional: keep `apps/api/.env.example` documenting the shape with a placeholder password comment, but never commit the real local secret.

## 6. Execution order (commands)

Run from the repo root (`/home/joelito/about-me`), in this order:

```bash
# 0. Feature branch
git checkout -b feature/phase-3

# 1. Create infra files (sections 5.1–5.3)

# 2. Start Umami stack (section 5.4)
cp infra/.env.example infra/.env
# set POSTGRES_PASSWORD=$(openssl rand -hex 24) and APP_SECRET=$(openssl rand -hex 32)
docker rm -f portfolio-pg 2>/dev/null || true
docker compose -f infra/docker-compose.umami.yml --env-file infra/.env up -d
curl -sf http://localhost:3001/api/heartbeat

# 3. Dashboard: change password, add website, copy website ID (section 5.4)

# 4. Web tracking (sections 5.5–5.9)
# update .env.example, vite-env.d.ts, add UmamiAnalytics (+ test), mount in main.tsx
cp apps/web/.env.example apps/web/.env
# set VITE_UMAMI_WEBSITE_ID=<uuid from dashboard>

# 5. Point apps/api/.env DATABASE_URL at the new POSTGRES_PASSWORD; migrate if volume is fresh
pnpm --filter @portfolio/api prisma:migrate

# 6. Verify
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @portfolio/web build

# 7. Manual smoke
pnpm --filter @portfolio/web dev
# visit http://localhost:5173, click around, confirm pageview in Umami Realtime / website stats

# 8. Commit on feature/phase-3
git add infra apps/web/.env.example apps/web/src phases/phase-3
git commit -m "feat(analytics): self-hosted Umami + web tracking script (phase 3)"
```

## 7. Acceptance criteria

Phase 3 is complete when **all** of the following hold:

- [ ] `infra/postgres/init.sql` exists and creates the `umami` database on first Postgres boot.
- [ ] `infra/docker-compose.umami.yml` starts healthy `postgres` + `umami` containers.
- [ ] Umami responds on `http://localhost:3001` (`/api/heartbeat` succeeds).
- [ ] Default admin password has been changed; a website exists in the dashboard.
- [ ] `apps/web` documents `VITE_UMAMI_URL` and `VITE_UMAMI_WEBSITE_ID`.
- [ ] With both vars set, the SPA injects `<script defer src="{url}/script.js" data-website-id="…">`.
- [ ] With vars unset, no Umami script is injected (unit test proves this).
- [ ] At least one pageview from local `apps/web` appears in the Umami dashboard.
- [ ] Nest API `DATABASE_URL` uses the same `POSTGRES_PASSWORD` as `infra/.env` and can reach the `portfolio` DB (migrate if needed).
- [ ] Compose refuses to start if `POSTGRES_PASSWORD` or `APP_SECRET` is missing/empty.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm --filter @portfolio/web build` succeed **without** requiring Umami to be running for the automated suite.

## 8. Testing architecture

Phase 3 adds a thin **web unit** check only:

- **Unit:** `UmamiAnalytics.test.tsx` — env present vs absent.
- **Manual / exploratory:** dashboard pageview after `pnpm --filter @portfolio/web dev`.
- **Not required:** Playwright asserting on third-party script network calls; Umami container in CI; Testcontainers for Umami.

Automated tests must remain green on a machine that has never started Umami.

## 9. Notes & decisions

- **Phase 3 vs Phase 4:** Phase 3 owns the *analytics learning loop* (DB split, Umami container, tracker in the SPA). Phase 4 owns production Dockerfiles and the full Compose graph (`web`, `api`, `postgres`, `umami`, `cloudflared`). Expect Phase 4 to **merge** `docker-compose.umami.yml` into `docker-compose.yml` rather than run two compose files in production.
- **Port 3001:** avoids fighting Nest on 3000. Production will use Cloudflare hostnames, not host ports.
- **Strong secrets, no weak fallbacks:** `POSTGRES_PASSWORD` and `APP_SECRET` are generated (`openssl rand -hex …`), stored only in `infra/.env`, and required via Compose `${VAR:?…}`. Do not default either to `portfolio` or a placeholder string.
- **Shared Postgres role for Umami:** same `POSTGRES_USER` / password for both DBs is acceptable for local/Pi learning. A dedicated `umami` DB role can be added in Phase 4/hardening without changing the web tracker.
- **Conditional loader vs `index.html`:** React injection keeps analytics optional and testable; Vite HTML env replacement would still leave an empty `data-website-id` unless wrapped in build-time logic.
- **SPA routing:** rely on Umami’s History API hooks; only add manual `window.umami?.track()` if Realtime shows load pageviews but not client-side navigations on the pinned image version.
- **`PageEvent` in Prisma:** remains unused. Umami is the product analytics path; `TrackingEvent` / `PageEvent` stay available for optional first-party events later.
- **Image tag:** prefer `ghcr.io/umami-software/umami:postgresql-latest` for Postgres-oriented builds; pin before production deploy in Phase 4/5.
- Exact image tags and Umami UI labels may shift slightly across versions; heartbeat URL and `script.js` + `data-website-id` contract are the stable integration points.
