# Phase 6 - Technical Specification

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. High-level overview in [`plan.md`](plan.md).

This document is the implementation contract for Phase 6. Follow it top-to-bottom and do not expand scope: establish CI, pre-deploy E2E, immutable ARM64 image delivery, Pi deployment, monitoring, response-header hardening, and off-site backup replication. Do not build an authentication system in this phase.

---

## 1. Scope

**In scope**

- A required pull-request workflow running frozen install, formatting, lint, type checking, and coverage-enabled Vitest.
- A deployment workflow that runs quality checks and Playwright before publishing or deploying.
- Native CI E2E through nginx and the Compose stack, with failure artifacts.
- GHCR publication of API and web images for `linux/arm64`, tagged by commit SHA.
- Deployment from a trusted self-hosted runner on the Pi; no inbound router port or public SSH service.
- Exact-image deployment, health waits, and automatic rollback.
- Uptime Kuma with persistent data and a loopback-only administration port.
- Browser response-header hardening compatible with the current self-hosted Umami integration.
- Copying completed Postgres dumps to storage outside the Pi.
- Operational documentation and verification.

**Out of scope**

- Implementing users, sessions, OAuth, JWT, Passport, account UI, or auth database tables. Record these as future work only.
- Running pull-request code on the Pi or any other self-hosted runner.
- Kubernetes, Docker Swarm, Watchtower, or a second deployment orchestrator.
- Publishing Postgres, Umami, Cloudflared, or Uptime Kuma as project-owned images.
- Replacing Cloudflare Tunnel or opening inbound ports on the home router.
- Moving secrets into source, image layers, workflow logs, or GitHub Actions artifacts.
- Guaranteeing host/power-loss detection with Kuma running on the same Pi. An external dead-man monitor is future hardening.

## 2. Conventions

- Run repository commands from `/home/joelito/about-me` unless stated otherwise.
- Use Node 22, Corepack, and the checked-in `pnpm-lock.yaml`; CI installs with `pnpm install --frozen-lockfile`.
- Keep GitHub Actions pinned to immutable commit SHAs where practical. A reviewed major tag is acceptable initially, but Dependabot must maintain it.
- GHCR image names are lowercase:
  - `ghcr.io/joelitooo/portfolio-api`
  - `ghcr.io/joelitooo/portfolio-web`
- The deployable tag is the full Git commit SHA. `latest` is a convenience tag, never the deployment input.
- `VITE_*` values are public build-time configuration, not secrets. The web production image is built with:
  - `VITE_API_URL=https://api.joelitoo.com`
  - `VITE_UMAMI_URL=https://analytics.joelitoo.com`
  - the existing production `VITE_UMAMI_WEBSITE_ID`
- Runtime secrets stay in the Pi's gitignored `infra/.env`. They are not copied into GitHub unless a CI-only value is required.
- Pull-request and E2E jobs use GitHub-hosted runners. Only the final deploy job uses `[self-hosted, linux, ARM64, portfolio-pi]`.
- The Pi runner accepts trusted `main` deployments only. Never target it from `pull_request`, `pull_request_target`, or a workflow that checks out untrusted refs.
- Keep local development intact: if no registry image variables are set, Compose continues to build/tag `portfolio-api:local` and `portfolio-web:local`.
- Do not publish Uptime Kuma publicly in this phase. Reach its loopback port from the LAN or an SSH port-forward.

## 3. Prerequisites

### 3.1 Confirm Phase 5

Before implementation:

```bash
curl -fsS https://joelitoo.com/healthz
curl -fsS https://api.joelitoo.com/health
curl -fsS https://analytics.joelitoo.com/api/heartbeat
docker compose -f infra/docker-compose.yml ps
sudo systemctl is-enabled portfolio-pg-backup.timer
```

The public checks must succeed, the Phase 5 services must be healthy, and a recent local dump must exist under `/var/backups/portfolio`.

### 3.2 Create the feature branch

The planning split must happen before this branch is created. Use `master` as the base when it exists; otherwise use the repository's actual default branch, expected to be `main`:

```bash
git fetch origin
git checkout master 2>/dev/null || git checkout main
git pull --ff-only
git checkout -b feature/phase-6
```

All Phase 6 implementation work happens on `feature/phase-6`.

### 3.3 GitHub and Pi setup

Manual account-level setup:

1. Push the repository to `github.com/Joelitooo/about-me`.
2. Enable Actions and allow workflows to write repository packages.
3. Create a protected `production` environment. Add required reviewers if deployment approval is desired.
4. Protect `main`; require the pull-request quality job and disallow force pushes.
5. In repository settings, add a self-hosted runner on the Pi using GitHub's current Linux ARM64 commands.
6. Add the custom runner label `portfolio-pi` and install the runner as a systemd service.

Verify on the Pi:

```bash
systemctl status 'actions.runner.*' --no-pager
docker version
docker compose version
git --version
```

The runner must run as a dedicated unprivileged account that can access Docker. Repository collaborators who can alter workflows effectively gain code execution on this host; keep write access narrow.

### 3.4 Required GitHub configuration

Use a GitHub `production` environment and define:

- `VITE_UMAMI_WEBSITE_ID` — environment variable or secret; it is public in the built bundle, but storing it here keeps production configuration centralized.

No PAT is required for project images. `GITHUB_TOKEN` with `packages: write` publishes them and, for a package linked to this repository, reads them during deployment.

### 3.5 Off-site destination

The default implementation uses `rsync` over SSH. On the Pi, create `/etc/default/portfolio-pg-backup-offsite`:

```env
BACKUP_DIR=/var/backups/portfolio
BACKUP_REMOTE=backup-user@backup-host:/srv/backups/portfolio/
```

Create a restricted SSH key for the backup destination, pre-populate `known_hosts`, and prove a non-interactive transfer works. Do not put this file or the private key in the repository.

## 4. Target file tree

```text
about-me/
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── apps/
│   └── web/
│       ├── e2e/
│       │   └── production.spec.ts
│       └── playwright.config.ts
├── infra/
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── docker-compose.ci.yml
│   ├── nginx.conf
│   ├── scripts/
│   │   ├── deploy.sh
│   │   ├── pg-backup.sh
│   │   └── pg-backup-offsite.sh
│   └── systemd/
│       ├── portfolio-pg-backup.service
│       └── portfolio-pg-backup-offsite.service
├── package.json
├── README.md
└── phases/
    └── phase-6/
        ├── plan.md
        └── spec.md
```

No application authentication files or Prisma migration are part of this tree.

## 5. File-by-file specification

### 5.1 Root `package.json`

Add one root script:

```json
"test:e2e": "pnpm --filter @portfolio/web test:e2e"
```

Do not hide CI behavior behind a large shell expression in `package.json`; the workflow should show each gate separately.

### 5.2 `apps/web/playwright.config.ts`

Preserve the local default, but support an already-running external stack:

```ts
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const externalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === "1";
```

Use `baseURL` in `use`. Set `webServer` to `undefined` when `externalServer` is true; otherwise retain the existing `pnpm dev` server. The result must support both:

```bash
# Local Vite behavior, unchanged
pnpm test:e2e

# Compose/nginx behavior
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 \
PLAYWRIGHT_EXTERNAL_SERVER=1 \
pnpm test:e2e
```

Keep Chromium, CI retries, `forbidOnly`, and trace-on-first-retry.

### 5.3 `apps/web/e2e/production.spec.ts`

Add production-path checks that do not depend on seeded user data:

- `/healthz` returns 200 and body `ok`.
- A deep route returns 200 and renders the SPA.
- `/` sends the expected CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- The home page has no uncaught page errors or failed same-origin asset requests.
- If the CI stack enables Umami, the tracker request is allowed by CSP. Otherwise keep the existing component test as the tracker gate.

Do not make CI call the live production domain before image publication. This suite targets the ephemeral Compose stack.

### 5.4 `infra/docker-compose.yml`

Make image references overridable while preserving local builds:

```yaml
api:
  image: ${API_IMAGE:-portfolio-api:local}

web:
  image: ${WEB_IMAGE:-portfolio-web:local}
```

Keep both existing `build` blocks. Local `docker compose build` still works; production deploys use `pull` and `up --no-build`.

Add Uptime Kuma:

```yaml
uptime-kuma:
  image: louislam/uptime-kuma:1
  container_name: portfolio-uptime-kuma
  restart: unless-stopped
  profiles: ["monitoring"]
  ports:
    - "127.0.0.1:${KUMA_PORT:-3002}:3001"
  volumes:
    - portfolio-kuma-data:/app/data
```

Add `portfolio-kuma-data` to top-level volumes. Resolve and pin a tested digest during implementation so production is not permanently left on a floating major tag.

On the Pi, set:

```env
COMPOSE_PROFILES=tunnel,monitoring
```

Do not add Kuma to Cloudflare ingress. After startup, open `http://127.0.0.1:3002` on the Pi or forward it over an authenticated LAN SSH session. Create monitors:

- HTTPS keyword monitor: `https://joelitoo.com/healthz`, keyword `ok`.
- HTTPS JSON/keyword monitor: `https://api.joelitoo.com/health`, keyword `"status":"ok"`.
- HTTPS monitor: `https://analytics.joelitoo.com/api/heartbeat`.

Use 60-second intervals and three retries. Configure at least one outbound notification and send its built-in test.

### 5.5 `infra/docker-compose.ci.yml`

Create a small overlay for E2E. It must:

- Disable restart policies.
- Keep Cloudflared and Kuma profiles inactive.
- Use CI-only values such as `POSTGRES_PASSWORD=ci-not-secret` and `APP_SECRET=ci-not-secret`.
- Set `CORS_ORIGIN=http://127.0.0.1:8080`.
- Build web with `VITE_API_URL=http://127.0.0.1:3000`.
- Publish the existing loopback ports.

Actions must use a unique project name and always clean volumes:

```bash
docker compose \
  -p "portfolio-ci-${GITHUB_RUN_ID}" \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.ci.yml \
  up -d --build --wait

docker compose \
  -p "portfolio-ci-${GITHUB_RUN_ID}" \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.ci.yml \
  down -v --remove-orphans
```

The cleanup command belongs in an `if: always()` step.

### 5.6 `.github/workflows/ci.yml`

This workflow is both directly callable and a PR check:

```yaml
name: CI

on:
  pull_request:
  workflow_call:

permissions:
  contents: read
```

Define one `quality` job on `ubuntu-latest`:

1. Check out the exact ref.
2. Set up Node 22 with pnpm caching.
3. Enable Corepack and activate pnpm 9.
4. Run `pnpm install --frozen-lockfile`.
5. Run, as separate named steps:
   - `pnpm format:check`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test:coverage`

The API's existing thresholds remain the minimum: 60% lines/functions/statements and 50% branches. Do not lower thresholds to make CI pass. Upload coverage reports on failure if they help diagnosis; never upload `.env` files.

Because API integration tests use Testcontainers, retain access to the GitHub-hosted runner's Docker daemon. Do not replace the real Postgres integration test with mocks.

### 5.7 `.github/workflows/deploy.yml`

Trigger on pushes to `main` and support a manual dispatch:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  packages: write
```

Jobs run in this order:

1. **quality** — call `./.github/workflows/ci.yml`.
2. **e2e** — GitHub-hosted `ubuntu-latest`, depending on quality.
3. **publish** — GitHub-hosted, depending on E2E.
4. **deploy** — Pi self-hosted runner, depending on publish, with `environment: production`.
5. **smoke** — either the deploy job's final step or a GitHub-hosted follow-up checking the two public health URLs.

The E2E job:

- Installs dependencies and Chromium with its Linux dependencies:
  `pnpm --filter @portfolio/web exec playwright install --with-deps chromium`.
- Starts the Compose CI stack with `--wait`.
- Runs root `pnpm test:e2e` with external-server variables.
- On failure, uploads `apps/web/playwright-report`, `apps/web/test-results`, and sanitized Compose logs.
- Always removes containers and volumes.

The publish job uses Buildx/QEMU and a two-item matrix:

- API: `infra/api.Dockerfile` → `ghcr.io/joelitooo/portfolio-api`.
- Web: `infra/web.Dockerfile` → `ghcr.io/joelitooo/portfolio-web`.

For each image:

- Context is the repository root.
- Platform is `linux/arm64`.
- Push only after quality and E2E pass.
- Publish `${{ github.sha }}` and `latest`.
- Enable GitHub Actions build cache.
- Pass the three production `VITE_*` build arguments only to the web build.
- Add OCI source and revision labels.

The deploy job:

- Uses `[self-hosted, linux, ARM64, portfolio-pi]`.
- Checks out exactly `${{ github.sha }}`.
- Logs into GHCR with `GITHUB_TOKEN`.
- Runs `infra/scripts/deploy.sh "${{ github.sha }}"`.
- Never runs arbitrary pull-request refs.

Set a concurrency group such as `production` with `cancel-in-progress: false`; deployments must serialize rather than interrupt one another midway.

### 5.8 `infra/scripts/deploy.sh`

Write a POSIX shell script with `set -eu`. It accepts exactly one full SHA and rejects an empty or malformed tag. Its contract:

1. Set:
   - `API_IMAGE=ghcr.io/joelitooo/portfolio-api:<sha>`
   - `WEB_IMAGE=ghcr.io/joelitooo/portfolio-web:<sha>`
2. Read and retain the currently running API and web image references with `docker inspect`.
3. Pull the requested images.
4. Validate Compose config with `--env-file`, then run
   `docker compose --env-file … -f infra/docker-compose.yml up -d --no-build --no-deps api web`.
5. Wait up to 120 seconds for both containers to report healthy.
6. Check `http://127.0.0.1:8080/healthz` and `http://127.0.0.1:3000/health`.
7. If any step after replacement fails, restore both prior image references and recreate the services.
8. Print the deployed SHA and final container status.

Run it from the repository root. The self-hosted runner checkout has no
gitignored `infra/.env`, so load interpolation from
`/etc/portfolio/deploy.env` via `docker compose --env-file` (overridable with
`PORTFOLIO_ENV_FILE`). That file is root-owned, mode `0640`, group `docker`
(so both the operator and the self-hosted runner can read it), and is created
on the Pi outside git. Do not write secrets into the checkout. Validate Compose config before arming rollback so a missing
env file cannot trigger a phantom restore. Use a shell trap so health-check
failure invokes rollback. A rollback is successful only after the same local
health checks pass.

After a successful deploy, remove dangling project images but retain at least the current and previous tagged versions. Do not run broad `docker system prune -a`.

### 5.9 `infra/nginx.conf`

Retain the existing real-IP and cache behavior. Add:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://analytics.joelitoo.com; connect-src 'self' https://api.joelitoo.com https://analytics.joelitoo.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header X-Frame-Options "DENY" always;
```

Replace the existing `SAMEORIGIN` line rather than sending two `X-Frame-Options` values. Keep `nosniff` and `strict-origin-when-cross-origin`.

`style-src 'unsafe-inline'` is a deliberate compatibility concession for application styling; do not add `'unsafe-inline'` to `script-src`. Do not add `Cross-Origin-Embedder-Policy`, which can break third-party resources without a demonstrated need.

Keep HSTS at the Cloudflare edge, not nginx, because nginx receives plain HTTP from the tunnel connector. Enable HSTS only after the domain and HTTPS path have been stable and the owner accepts its long-lived rollback implications.

### 5.10 API header review

Keep `helmet()` enabled in `apps/api/src/main.ts`. Verify the public API returns at least:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options`
- a restrictive referrer policy

Do not force the SPA's CSP onto JSON responses and do not loosen CORS. `CORS_ORIGIN` remains exactly the production web origin.

### 5.11 Off-site backup replication

Create `infra/scripts/pg-backup-offsite.sh` as a POSIX shell script. It must:

- Use `set -eu`.
- Require `BACKUP_REMOTE`.
- Find only completed `pg_dumpall-*.sql.gz` files; never copy dot-prefixed temporary dumps.
- Run `gzip -t` before transfer.
- Use `rsync --archive --compress --ignore-existing` over SSH.
- Print the transferred filename and fail non-zero if validation or transfer fails.

Create `infra/systemd/portfolio-pg-backup-offsite.service`:

```ini
[Unit]
Description=Copy portfolio Postgres dumps off-site
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/default/portfolio-pg-backup-offsite
ExecStart=/usr/local/bin/portfolio-pg-backup-offsite
```

Add this to the existing local backup service's `[Unit]` section:

```ini
OnSuccess=portfolio-pg-backup-offsite.service
```

An off-site transfer failure must not delete or invalidate the successful local dump. Test restore integrity from the remote copy, not merely file existence.

### 5.12 `.github/dependabot.yml`

Enable monthly updates for:

- `github-actions` at `/`
- `npm` at `/`, using the pnpm lockfile
- `docker` for `/infra`

Cap open PRs to avoid noise and group compatible minor/patch updates where supported. Major Postgres, Umami, and Uptime Kuma updates require manual release-note review.

### 5.13 `infra/.env.example`

Document without real secrets:

```env
# Phase 6 image overrides. Leave unset for local :local builds.
# API_IMAGE=ghcr.io/joelitooo/portfolio-api:<full-git-sha>
# WEB_IMAGE=ghcr.io/joelitooo/portfolio-web:<full-git-sha>

# Enable both production-only services on the Pi.
COMPOSE_PROFILES=tunnel,monitoring
KUMA_PORT=3002
```

The deploy workflow passes image variables for each run; operators do not manually pin `latest` in this file.

### 5.14 `README.md`

Add a `## CI/CD and operations` section covering:

- PR quality gates and local equivalents.
- Main-branch E2E, ARM64 image publication, and production approval.
- Why the Pi runner is deployment-only.
- Current image inspection and manual rollback commands.
- Kuma access, monitor list, and notification test.
- Local and off-site backup locations plus restore verification.
- Links to this spec for full setup.

Do not include runner registration tokens, registry credentials, backup hostnames, or private keys.

## 6. Execution order

```bash
# 1. Branch
git checkout -b feature/phase-6

# 2. Test baseline before edits
corepack enable
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage

# 3. Implement Playwright env support and the production E2E checks
pnpm --filter @portfolio/web exec playwright install chromium
pnpm test:e2e

# 4. Add Compose image overrides, CI overlay, Kuma, and headers
docker compose -f infra/docker-compose.yml config >/dev/null
docker compose -f infra/docker-compose.yml -f infra/docker-compose.ci.yml config >/dev/null

# 5. Run the same ephemeral E2E path used by Actions
export POSTGRES_PASSWORD=ci-not-secret APP_SECRET=ci-not-secret
export CORS_ORIGIN=http://127.0.0.1:8080 VITE_API_URL=http://127.0.0.1:3000
docker compose -p portfolio-ci-local \
  -f infra/docker-compose.yml -f infra/docker-compose.ci.yml up -d --build --wait
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 PLAYWRIGHT_EXTERNAL_SERVER=1 pnpm test:e2e
docker compose -p portfolio-ci-local \
  -f infra/docker-compose.yml -f infra/docker-compose.ci.yml down -v --remove-orphans

# 6. Add and syntax-check workflows and scripts
sh -n infra/scripts/deploy.sh
sh -n infra/scripts/pg-backup-offsite.sh

# 7. Re-run all local gates
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:coverage

# 8. Push the feature branch and open a PR; confirm CI passes

# 9. After merge, observe quality -> E2E -> publish -> production deploy

# 10. On the Pi, enable Kuma and off-site copy
sudo install -m 0755 infra/scripts/pg-backup-offsite.sh /usr/local/bin/
sudo install -m 0644 infra/systemd/portfolio-pg-backup-offsite.service /etc/systemd/system/
sudo install -m 0644 infra/systemd/portfolio-pg-backup.service /etc/systemd/system/
sudo systemctl daemon-reload
docker compose -f infra/docker-compose.yml up -d uptime-kuma

# 11. Configure Kuma monitors/notifications and test a remote backup restore
```

Do not merge until the feature-branch PR workflow is green. Do not test deployment with an untrusted branch on the Pi runner.

## 7. Acceptance criteria

- [ ] `ci.yml` runs on pull requests and is reusable by `deploy.yml`.
- [ ] Frozen install, formatting, lint, type checking, and coverage all pass.
- [ ] Existing API coverage thresholds are enforced and were not lowered.
- [ ] API Testcontainers integration tests run against real Postgres in CI.
- [ ] Playwright can run locally against Vite and in CI against Compose/nginx.
- [ ] The deployment workflow cannot publish images until E2E passes.
- [ ] Failed E2E uploads useful reports/logs and always removes volumes.
- [ ] API and web images exist in GHCR for `linux/arm64` under the full merge SHA.
- [ ] Production deploys the SHA tag, never `latest`.
- [ ] Only the trusted deploy job targets the Pi runner.
- [ ] No router port or public SSH endpoint was added for CI/CD.
- [ ] Failed local health checks restore the previous API and web images.
- [ ] Uptime Kuma data survives container recreation.
- [ ] Kuma monitors web, API, and analytics and sends a test notification.
- [ ] Kuma's admin port is loopback-only and absent from Cloudflare ingress.
- [ ] CSP permits the app, API calls, and Umami tracking without browser violations.
- [ ] `script-src` does not contain `'unsafe-inline'` or `*`.
- [ ] Clickjacking, MIME sniffing, referrer, and permissions headers are present.
- [ ] Contact submission, deep links, dark mode, and analytics still work.
- [ ] A valid database dump is present on a destination outside the Pi.
- [ ] Restoring or inspecting the remote gzip proves it is not truncated.
- [ ] README documents normal deployment, rollback, runner, monitoring, and backups.
- [ ] No auth dependency, module, table, endpoint, or UI was added.

## 8. Verification

### 8.1 Local quality and E2E

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm test:e2e
```

Run the Compose E2E sequence from §6 as well; the Vite-only run does not verify nginx headers.

### 8.2 Image architecture

```bash
docker buildx imagetools inspect ghcr.io/joelitooo/portfolio-api:<sha>
docker buildx imagetools inspect ghcr.io/joelitooo/portfolio-web:<sha>
```

Both manifests must include `linux/arm64`. On the Pi:

```bash
docker inspect portfolio-api --format '{{.Config.Image}}'
docker inspect portfolio-web --format '{{.Config.Image}}'
```

Both references must end in the same full deployed SHA.

### 8.3 Public smoke and headers

```bash
curl -fsS https://joelitoo.com/healthz
curl -fsS https://api.joelitoo.com/health
curl -fsS https://analytics.joelitoo.com/api/heartbeat
curl -sSI https://joelitoo.com | \
  grep -iE 'content-security-policy|permissions-policy|x-frame-options|x-content-type-options|referrer-policy'
```

Use a browser to confirm there are no CSP errors while loading the site, navigating a deep link, submitting the contact form, and recording an Umami pageview.

### 8.4 Rollback drill

Deploy a known-good older SHA through the manual workflow dispatch, or deliberately fail the local health check in a controlled maintenance window. Confirm:

- the script exits non-zero for the bad release;
- both services return to their previous image references;
- local and public health endpoints recover;
- Postgres, Umami, Cloudflared, and Kuma are not recreated unnecessarily.

### 8.5 Monitoring

Recreate Kuma and confirm its state persists:

```bash
docker compose -f infra/docker-compose.yml up -d --force-recreate uptime-kuma
docker compose -f infra/docker-compose.yml ps uptime-kuma
```

Pause one monitored service briefly, confirm Kuma changes state and sends a notification, then restore it. This proves service-level monitoring only; document that a Pi power outage also takes Kuma offline.

### 8.6 Off-site backup

```bash
sudo systemctl start portfolio-pg-backup.service
sudo systemctl status portfolio-pg-backup-offsite.service --no-pager
```

On the remote destination, run `gzip -t` on the copied file and confirm it contains `CREATE DATABASE` and `contact_messages`. A copied filename alone is not acceptance.

## 9. Notes & decisions

- **Self-hosted deploy runner instead of inbound SSH.** GitHub-hosted runners cannot SSH to the Pi without exposing an ingress path. The Pi runner maintains an outbound connection to GitHub, preserving the Phase 5 rule that no home-router port is opened.
- **Never run PR code on the Pi.** A malicious or compromised pull request would otherwise gain the runner account's Docker access, which is effectively root on the host.
- **E2E before ARM64 publication.** The production-like stack is built for the GitHub runner's native architecture for speed and reliability. Only after it passes are equivalent Dockerfiles cross-built for ARM64 and pushed.
- **SHA tags are the release identity.** `latest` is mutable and unsuitable for rollback or audit. Compose receives explicit SHA image references during every deploy.
- **Kuma on the same Pi has a blind spot.** It detects container, endpoint, certificate, and application failures while the host is alive. It cannot report the Pi losing power or internet; an external heartbeat monitor is the later solution.
- **Kuma configuration is stateful.** Its SQLite data belongs in a named volume and backup policy. Do not commit the volume or notification credentials.
- **CSP is strict for scripts, pragmatic for styles.** The current Umami script has a known host and needs both `script-src` and `connect-src`. Inline scripts remain forbidden; inline styles remain temporarily allowed.
- **HSTS remains a deliberate operator decision.** Once enabled with a long max-age, clients remember it beyond a rollback. Cloudflare edge configuration is the correct place, after stable HTTPS operation.
- **Off-site copy is separate from dump creation.** Network failure must not turn a successful local backup into a failed or deleted backup. The `OnSuccess` service preserves this separation.
- **Auth is not “prepared” by adding unused dependencies.** The codebase has no user model or auth requirements yet. A later phase should begin with threat model, session strategy, account flows, and data model rather than speculative scaffolding here.
