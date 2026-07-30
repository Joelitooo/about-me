# Phase 5 - Deployment on the Pi + Cloudflare Tunnel

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. Technical details live in [`spec.md`](spec.md).

**Goal:** turn the Phase 4 container stack into the live public site. The Pi becomes a host that survives reboots, full disks, and mistakes (Docker log rotation, a host firewall, a nightly database dump); a Cloudflare Tunnel publishes `example.com`, `www`, `api.`, and `analytics.` without opening a single port on the home router; and the production env values replace the `localhost` ones the stack was verified against in Phase 4.

## Prerequisites

- Phase 4 complete: `docker compose -f infra/docker-compose.yml up -d` brings `postgres`, `api`, `web`, and `umami` to healthy, with images built natively for ARM64.
- The Pi runs Ubuntu Server 24.04 (arm64) with Docker Engine and Compose v2 installed and enabled. **This is already true on the current host**, so Phase 5 verifies the host instead of installing Docker from scratch.
- `infra/.env` exists on the Pi with the real `POSTGRES_PASSWORD` and `APP_SECRET`.
- Shell access to the Pi with `sudo`, and the ability to SSH in with port forwarding.

## Manual prerequisites (only you can do these)

Everything else in this phase is scripted. These four steps need your browser, your money, and your accounts — see [`spec.md`](spec.md) §3.2 for click-by-click detail.

1. **Pick and register a domain.** Roughly €10/year. It has to be decided before anything is built, because the API URL is compiled into the frontend bundle.
2. **Create a free Cloudflare account.** Email + password + confirmation link. The Free plan covers everything this phase needs.
3. **Add the domain to Cloudflare and wait for it to go Active.** Cloudflare gives you two nameservers; you set them at the registrar. Skipped entirely if you buy the domain through Cloudflare Registrar.
4. **Authorize the Pi once.** `cloudflared tunnel login` prints a URL; you open it, pick your domain, and click Authorize. That single browser action is what lets the Pi create its own tunnel and DNS records from then on.

No credit card, no paid add-on, and no Zero Trust dashboard onboarding is required — the tunnel is created from the command line.

## Steps

1. **Verify the host** — confirm Ubuntu 24.04 arm64, Docker + Compose v2, the `docker` group, a synced clock, and free disk. Install nothing that is already there.
2. **Cap Docker's logs** — `/etc/docker/daemon.json` with `json-file` rotation. Without it, container logs grow unbounded and eventually fill the SD card, which is the single most likely way this deployment dies.
3. **Close the LAN down** — enable `ufw` with SSH allowed. The published container ports are already loopback-only, so the tunnel is the only public path in.
4. **Install the `cloudflared` CLI** — from Cloudflare's apt repo, for the one-time tunnel/DNS setup and later debugging. The tunnel itself still runs in the container from Phase 4.
5. **Create the tunnel** — `cloudflared tunnel login` (the browser step), then `tunnel create portfolio`, which produces a UUID and a credentials file. Copy the credentials into `infra/cloudflared/credentials.json` and make it readable by UID 65532, the user the container runs as.
6. **Fill in the ingress** — replace the Phase 4 placeholders in `infra/cloudflared/config.yml` with the real UUID and hostnames, then create the four DNS records with `cloudflared tunnel route dns`.
7. **Switch the env to production** — real `https://` values for `CORS_ORIGIN` and the `VITE_*` build args, plus `COMPOSE_PROFILES=tunnel` so a plain `docker compose up -d` on the Pi starts the tunnel too.
8. **Register the site in Umami first** — reach the local Umami over an SSH port-forward, change the default password, add the website, and copy its ID. Doing this before the rebuild means the web image is built once with every production value baked in.
9. **Recover the visitor IP** — behind the tunnel every request arrives from the `cloudflared` container, so nginx logs and the API's rate limiter both see one address. A throttler guard keyed on `CF-Connecting-IP` and an nginx `real_ip` block fix that.
10. **Back up nightly** — a `pg_dumpall` script on a systemd timer with retention, so a bad migration or a dead SD card is recoverable.
11. **Go live and configure Cloudflare** — rebuild `web`, start the stack with the tunnel, then set SSL/TLS to Full (strict), turn on Always Use HTTPS, and redirect `www` to the apex.
12. **Prove it survives a reboot** — `sudo reboot`, then confirm all five containers and all four hostnames come back with no manual step.

## Deliverables

```
infra/
  cloudflared/
    config.yml                     # real UUID + hostnames (was placeholders)
    credentials.json               # NEW - secret, gitignored, never committed
  docker/
    daemon.json                    # NEW - log rotation, copied to /etc/docker/
  scripts/
    pg-backup.sh                   # NEW - nightly pg_dumpall + retention
  systemd/
    portfolio-pg-backup.service    # NEW
    portfolio-pg-backup.timer      # NEW
  nginx.conf                       # updated - real visitor IP in logs
  .env.example                     # updated - COMPOSE_PROFILES + prod examples

apps/api/src/common/
  cloudflare-throttler.guard.ts       # NEW - rate limit per visitor, not per tunnel
  cloudflare-throttler.guard.test.ts  # NEW

apps/api/src/app.module.ts         # updated - use the new guard
README.md                          # updated - deployment section
```

`infra/docker-compose.yml` needs no edits: Phase 4 already described the `cloudflared` service behind a `tunnel` profile, and `COMPOSE_PROFILES` in `infra/.env` is what enables it on the Pi.

## Done when

`https://example.com` serves the SPA over HTTPS with a valid certificate and working deep links; `https://api.example.com/health` returns `{"status":"ok"}`; the contact form submits from the real site and the row lands in Postgres; `https://analytics.example.com` shows the Umami dashboard and records a pageview from the live site; `https://www.example.com` redirects to the apex; no port is forwarded on the router and `ufw` is active; Docker logs are capped; a database dump exists in `/var/backups/portfolio`; and after `sudo reboot` everything returns on its own.

## Task checklist

- [ ] Host verified: Ubuntu 24.04 arm64, Docker + Compose v2 active, clock synced, disk headroom
- [ ] `/etc/docker/daemon.json` caps container logs and Docker restarted cleanly
- [ ] `ufw` active with SSH allowed; no container port bound to `0.0.0.0`
- [ ] `cloudflared` CLI installed; no host `cloudflared` systemd service running
- [ ] Tunnel `portfolio` created; `infra/cloudflared/credentials.json` in place, `chmod 600`, owned by `65532`
- [ ] `infra/cloudflared/config.yml` has the real UUID and the four hostnames
- [ ] Four proxied DNS records created via `cloudflared tunnel route dns`
- [ ] `infra/.env` holds production `CORS_ORIGIN`, `VITE_*`, and `COMPOSE_PROFILES=tunnel`
- [ ] Umami admin password changed and the website ID copied into `VITE_UMAMI_WEBSITE_ID`
- [ ] `CloudflareThrottlerGuard` keys the rate limiter on `CF-Connecting-IP`, with a unit test
- [ ] `infra/nginx.conf` resolves the real visitor IP in access logs
- [ ] Nightly `pg-backup` timer enabled and a first dump verified restorable
- [ ] `web` image rebuilt with production build args; all five containers healthy
- [ ] Cloudflare: SSL/TLS Full (strict), Always Use HTTPS, `www` → apex redirect, Rocket Loader off
- [ ] All four hostnames verified over HTTPS from outside the LAN
- [ ] Reboot test passes with no manual intervention
- [ ] `pnpm typecheck` / `lint` / `test` still pass and the work is committed on `feature/phase-5`
