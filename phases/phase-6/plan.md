# Phase 6 - CI/CD and production hardening

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. Technical details live in [`spec.md`](spec.md).

**Goal:** make the live Raspberry Pi deployment repeatable, observable, and safer to operate. Pull requests must pass formatting, lint, type checking, unit/integration tests, and coverage; changes reaching `main` must pass Playwright against a production-like stack before immutable ARM64 images are published to GHCR and pulled by the Pi. Uptime Kuma adds service monitoring, while a focused header review and off-site backup copy close the hardening gaps left by Phase 5.

## Prerequisites

- Phase 5 is complete: `https://joelitoo.com`, `https://api.joelitoo.com/health`, and `https://analytics.joelitoo.com` work through the Cloudflare Tunnel, and the stack survives a reboot.
- The project is hosted at `github.com/Joelitooo/about-me`, with `main` protected from direct pushes.
- GitHub Actions is enabled and GHCR package publishing is allowed for the repository.
- The Pi has outbound internet access and enough free disk for two generations of application images.
- A GitHub Actions self-hosted runner can be installed on the Pi. It is used only for trusted deployment jobs; pull-request code never runs on it.

## Manual prerequisites (only you can do these)

1. Create or confirm the GitHub repository and push the completed Phase 5 history.
2. Protect `main` and require the `quality` check before merging.
3. Register the Pi as a self-hosted GitHub Actions runner with labels `self-hosted`, `linux`, `ARM64`, and `portfolio-pi`.
4. Create a GitHub environment named `production`; optionally require manual approval before its deploy job starts.
5. Choose and configure Uptime Kuma notifications. Monitor setup and notification credentials live in Kuma's UI, not in git.
6. Provide an off-site backup destination and credentials. The default contract uses an SSH destination exposed as `BACKUP_REMOTE`; an S3-compatible destination is an acceptable substitution.

## Steps

1. **Add pull-request CI** — install with the frozen lockfile, then run `format:check`, `lint`, `typecheck`, and coverage-enabled Vitest on GitHub-hosted runners.
2. **Make Playwright stack-aware** — allow its base URL and local dev server behavior to be controlled by environment variables, then add a Compose overlay for isolated CI E2E runs.
3. **Test before publishing** — bring up a production-like native-architecture stack in Actions and run Chromium Playwright tests against nginx, the API, Postgres, and Umami.
4. **Publish immutable ARM64 images** — after quality and E2E pass on `main`, use Buildx to publish API and web images to GHCR under both the commit SHA and `latest`.
5. **Deploy without opening SSH to the internet** — run the final deployment job on the Pi's outbound-only self-hosted runner; pull the exact SHA images, recreate only the application services, wait for health checks, and roll back to the previous tag on failure.
6. **Add Uptime Kuma** — run it in Compose with persistent storage and a loopback-only admin port; monitor the public web, API, and analytics endpoints.
7. **Tighten response headers** — add a CSP compatible with the self-hosted Umami script, a restrictive Permissions Policy, and safe cross-origin defaults; verify headers and app behavior in Playwright.
8. **Copy backups off the Pi** — transfer completed database dumps to a remote destination after the local nightly backup and report failures through systemd.
9. **Document operations** — explain CI checks, image tags, production approvals, rollback, runner maintenance, monitoring, and backup recovery.

## Deliverables

```text
.github/
  workflows/
    ci.yml
    deploy.yml

apps/web/
  playwright.config.ts              # updated for dev and Compose targets
  e2e/
    production.spec.ts              # public behavior and header checks

infra/
  docker-compose.yml                # registry image overrides + Uptime Kuma
  docker-compose.ci.yml             # isolated E2E overlay
  nginx.conf                        # CSP and additional security headers
  .env.example                      # image/deploy/monitoring examples
  scripts/
    deploy.sh                       # pull, health check, rollback
    pg-backup-offsite.sh            # copy completed dumps off-host
  systemd/
    portfolio-pg-backup-offsite.service

package.json                        # root E2E command
README.md                           # CI/CD and operations guide
```

## Done when

Every pull request is blocked by a reproducible quality gate; a merge to `main` runs Playwright before publishing two commit-addressed ARM64 images; the Pi deploys those exact images through its outbound-only runner and rolls back on failed health checks; Kuma reports the public web, API, and analytics endpoints; browser and API behavior still work under the tightened headers; and a database dump exists outside the Pi.

## Task checklist

- [ ] `main` is protected and requires the `quality` check
- [ ] PR CI runs frozen install, format, lint, typecheck, and coverage
- [ ] API coverage thresholds remain enforced in CI
- [ ] Playwright runs against the Compose/nginx stack before image publication
- [ ] Failed E2E runs upload Playwright reports and container logs
- [ ] API and web images publish to GHCR for `linux/arm64` with SHA tags
- [ ] The Pi runner is restricted to trusted production deployment jobs
- [ ] Deployment pulls the exact SHA and has a tested automatic rollback path
- [ ] Uptime Kuma persists its data and monitors all three public services
- [ ] Uptime Kuma sends a test notification successfully
- [ ] CSP, Permissions Policy, and existing security headers are verified
- [ ] The app, contact form, routing, and Umami tracking still work with CSP enabled
- [ ] A nightly database dump is copied to a destination outside the Pi
- [ ] README documents CI, deployment, rollback, monitoring, and backup recovery
- [ ] Auth implementation remains out of scope and is recorded as a future phase
- [ ] The work is completed on `feature/phase-6`
