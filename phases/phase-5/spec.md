# Phase 5 - Technical Specification

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. High-level overview in [`plan.md`](plan.md).

This document is the implementation contract for Phase 5. It is written for an agent (or developer) to follow top-to-bottom: exact commands, full file contents, and the checks that prove each step worked. Phase 5 **publishes what Phase 4 already built** — it does not change application features, and it does not add CI/CD or uptime monitoring (Phase 6).

Two things in here cannot be automated: registering a domain and clicking Authorize in a browser. They are isolated in §3.2 so the rest can run unattended.

Throughout, `example.com` is the placeholder. Substitute the real domain everywhere, including inside `infra/.env` and `infra/cloudflared/config.yml`.

---

## 1. Scope

**In scope**

- Host hardening on the Pi: Docker log rotation, `ufw`, boot resilience verification.
- One-time `cloudflared` CLI install for tunnel creation and DNS routing.
- Creating the `portfolio` tunnel, placing `infra/cloudflared/credentials.json`, and filling the real UUID + hostnames into `infra/cloudflared/config.yml`.
- Four proxied DNS records: apex, `www`, `api`, `analytics`.
- Production values in `infra/.env`, including `COMPOSE_PROFILES=tunnel`, and a rebuild of the `web` image with production build args.
- Recovering the real visitor IP behind the tunnel: `getTracker` on `CF-Connecting-IP` for the API rate limiter, `real_ip` in nginx for access logs.
- Nightly `pg_dumpall` with retention, on a systemd timer.
- Cloudflare zone settings: encryption mode, Always Use HTTPS, `www` → apex redirect.
- Umami production setup: change the default password, register the site, capture the website ID.
- End-to-end verification of all four hostnames, plus a reboot test.

**Out of scope**

- Installing Docker or provisioning a fresh Ubuntu image. The current Pi already runs Ubuntu 24.04 arm64 with Docker Engine 29.x and Compose v2 active — §3.1 verifies this instead.
- GitHub Actions build/push/deploy, image registry, coverage gates, Uptime Kuma (Phase 6).
- Cloudflare Access / Zero Trust policies in front of `analytics.example.com` (see §9).
- Off-site backup replication. Dumps land on the same disk as the data; copying them elsewhere is manual for now (§9).
- A tightened Content-Security-Policy (Phase 6), WAF custom rules, or Cloudflare rate limiting rules.
- Any change to application behaviour: no new endpoints, no schema change, no UI change. The only application diff is how the rate limiter identifies a caller.

## 2. Conventions

- **Placeholder domain:** `example.com`. Hostnames are the apex, `www.example.com`, `api.example.com`, `analytics.example.com`.
- **Tunnel name:** `portfolio`. Tunnel type: **locally-managed** — ingress rules live in `infra/cloudflared/config.yml` in git, not in the Cloudflare dashboard.
- **Where things run:** the tunnel runs in the `cloudflared` **container** from Phase 4. The `cloudflared` binary is installed on the host only for one-time setup and debugging; **never** run `cloudflared service install`, or two connectors will race for the same tunnel.
- **Secrets:** `infra/cloudflared/credentials.json` and `~/.cloudflared/cert.pem` are secrets. The first is already in `.gitignore`; the second never enters the repo.
- **Container UID:** `cloudflare/cloudflared` runs as UID/GID `65532` (`nonroot`). Any file it must read has to be readable by that UID — this is the most common reason a tunnel fails to start (§5.4).
- **Commands:** run from the repo root (`/home/joelito/about-me`) unless stated otherwise. `docker compose` always takes `-f infra/docker-compose.yml`.
- **Public exposure:** nothing is port-forwarded on the router. Published container ports stay bound to `127.0.0.1` and exist only for local debugging.
- **Rebuild rule:** changing any `VITE_*` value requires rebuilding the `web` image, because Vite inlines them at build time. Plan the value changes so the image is built once (§5.8).

## 3. Prerequisites

### 3.1 Verify the host (install nothing that is already present)

```bash
lsb_release -ds                      # Ubuntu 24.04.x LTS
uname -m                             # aarch64
docker --version                     # Docker Engine 20.10+ (29.x present)
docker compose version               # Compose v2+
systemctl is-enabled docker          # enabled  <- required for reboot survival
id -nG | tr ' ' '\n' | grep -x docker  # current user is in the docker group
timedatectl | grep -E 'synchronized|Time zone'   # clock synced
df -h /                              # at least ~10 GB free
free -h                              # >= 2 GB RAM
```

If `systemctl is-enabled docker` prints `disabled`, run `sudo systemctl enable --now docker`. Everything else above should already pass; treat a failure as a blocker rather than working around it.

Only if starting from a genuinely fresh Ubuntu image, install Docker from Docker's own repository (Ubuntu's `docker.io` package lags and ships Compose v1):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"      # log out and back in for this to apply
sudo systemctl enable --now docker
```

The Phase 4 stack must already be healthy before continuing:

```bash
docker compose -f infra/docker-compose.yml ps
# postgres, api, web, umami -> Up (healthy)
```

### 3.2 What must come from you (Cloudflare, in a browser)

Assume no prior Cloudflare knowledge. Do these four in order; nothing else in this spec can proceed without them.

**1. Register a domain (~€10/year).**

Pick the exact name first — it gets compiled into the frontend bundle, so changing it later means a rebuild and a DNS redo. Two routes:

- **Cloudflare Registrar** (`dash.cloudflare.com` → Domain Registration → Register Domain). Sells at cost with no markup, and the domain lands in your Cloudflare account already configured, which skips step 3 entirely. Requires the account from step 2 first.
- **Any other registrar** (Porkbun, Namecheap, and so on). Fine too — step 3 then applies.

TLD note: `.dev` and `.app` are on the HSTS preload list, meaning browsers refuse plain HTTP for them. That is not a problem here (everything is HTTPS through Cloudflare), just be aware that `http://` will never work on those.

**2. Create a free Cloudflare account.**

Go to `dash.cloudflare.com/sign-up`, enter an email and password, confirm the emailed link. The Free plan covers everything in this phase: unlimited tunnel bandwidth, free TLS certificates, and proxied DNS. **No credit card is required**, and no Zero Trust onboarding is needed, because the tunnel is created from the command line rather than the Tunnels dashboard.

**3. Add the domain to Cloudflare and wait for Active.**

Skip this if you bought through Cloudflare Registrar.

1. In the dashboard: **Add a domain** → type the domain → choose the **Free** plan.
2. Cloudflare scans the existing DNS records and shows two nameservers, something like `ana.ns.cloudflare.com` and `bob.ns.cloudflare.com`.
3. Log in to the registrar, find the nameserver setting (usually "DNS" or "Nameservers"), switch from the registrar's default to **custom nameservers**, and enter Cloudflare's two.
4. Back in Cloudflare, the zone status goes from **Pending** to **Active**. Usually minutes; officially up to 24 hours. You will get an email.

Do not continue until the zone reads **Active** — tunnel DNS creation fails against a pending zone.

**4. Authorize the Pi once (§5.4 walks through it).**

`cloudflared tunnel login` on the Pi prints a URL. Because the Pi is headless, copy that URL into a browser on your laptop or phone, log in to Cloudflare if prompted, select the domain, and click **Authorize**. Cloudflare then writes `~/.cloudflared/cert.pem` on the Pi, and from that point the Pi can create tunnels and DNS records for that zone by itself. This is the only interactive step.

**Decisions to confirm before starting**

| Decision                                | Default in this spec                             |
| --------------------------------------- | ------------------------------------------------ |
| Domain                                  | `example.com` (placeholder — replace everywhere) |
| Site hostname                           | apex, with `www` 301-redirected to it            |
| API hostname                            | `api.example.com`                                |
| Analytics hostname                      | `analytics.example.com`                          |
| Is the Umami dashboard publicly visible | Yes, gated only by Umami's own login (§9)        |

### 3.3 Feature branch

```bash
git checkout -b feature/phase-5
```

All Phase 5 work happens on this branch. Do not commit directly to `main`.

## 4. Target file tree

```
about-me/
├── apps/
│   └── api/
│       └── src/
│           ├── app.module.ts              # updated (getTracker wiring)
│           └── common/
│               ├── client-ip.ts           # new
│               └── client-ip.test.ts      # new
├── infra/
│   ├── .env                               # updated (untracked, on the Pi)
│   ├── .env.example                       # updated
│   ├── nginx.conf                         # updated (real_ip)
│   ├── docker-compose.yml                 # UNCHANGED
│   ├── cloudflared/
│   │   ├── config.yml                     # updated (real UUID + hostnames)
│   │   └── credentials.json               # new, secret, gitignored
│   ├── docker/
│   │   └── daemon.json                    # new (source for /etc/docker/daemon.json)
│   ├── scripts/
│   │   └── pg-backup.sh                   # new
│   └── systemd/
│       ├── portfolio-pg-backup.service    # new
│       └── portfolio-pg-backup.timer      # new
├── README.md                              # updated (Deployment section)
└── phases/
    └── phase-5/
        ├── plan.md
        └── spec.md
```

No new pnpm packages; `pnpm-lock.yaml` is untouched.

## 5. File-by-file specification

### 5.1 `infra/docker/daemon.json` → `/etc/docker/daemon.json`

Docker's default `json-file` driver never rotates. One noisy container fills the SD card, and a full disk takes Postgres down with it. The repo keeps the file so the config is reviewable; it is copied into place because Docker only reads `/etc/docker/daemon.json`.

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
```

`live-restore` keeps containers running while the Docker daemon itself restarts or upgrades, which turns a daemon update from an outage into a non-event.

Install and apply:

```bash
sudo install -m 0644 infra/docker/daemon.json /etc/docker/daemon.json
sudo systemctl restart docker
docker info --format '{{.LoggingDriver}}'   # json-file
```

Log limits apply to containers **created after** the restart, so recreate the stack once (§6). Verify afterwards with:

```bash
docker inspect portfolio-api --format '{{json .HostConfig.LogConfig}}'
# {"Type":"json-file","Config":{"max-file":"3","max-size":"10m"}}
```

### 5.2 Host firewall (`ufw`)

The tunnel makes inbound ports unnecessary, so the host should refuse everything except SSH on the LAN.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH          # MUST come before enable, or SSH is cut off
sudo ufw --force enable
sudo ufw status verbose
```

Notes:

- **Allow SSH before enabling.** Enabling `ufw` with a default-deny policy over an SSH session and no SSH rule locks you out until you have physical access.
- `cloudflared` only needs **outbound** access (UDP 7844 for QUIC, TCP 7844 as fallback, TCP 443 for the API), which `default allow outgoing` covers.
- Docker publishes ports via its own iptables chains and can bypass `ufw`. That is not a hole here because every published port is bound to `127.0.0.1` — confirm with `docker compose ps` showing no `0.0.0.0` bindings.

### 5.3 Install the `cloudflared` CLI (one-time)

Needed only to create the tunnel and its DNS records, and for later debugging (`cloudflared tunnel list`, `tunnel info`).

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared noble main' \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared
cloudflared --version
```

Fallback if the apt repo is unreachable (loses `apt upgrade` support, which does not matter for a setup-only tool):

```bash
curl -fL -o /tmp/cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i /tmp/cloudflared.deb
```

**Do not run `cloudflared service install`.** The connector runs in the container; a host service would open a second connection for the same tunnel and split traffic unpredictably between them.

### 5.4 Create the tunnel and its credentials

```bash
# 1. Interactive: prints a URL. Open it in any browser, pick example.com, Authorize.
cloudflared tunnel login
#    -> writes ~/.cloudflared/cert.pem  (account credential for this zone)

# 2. Create the tunnel. Note the UUID it prints.
cloudflared tunnel create portfolio
#    -> writes ~/.cloudflared/<UUID>.json  (this tunnel's credential)

# 3. Confirm it exists (0 connections so far is expected)
cloudflared tunnel list
```

Copy the credential into the directory the container mounts, and make it readable by the container's user:

```bash
TUNNEL_ID=$(cloudflared tunnel list --output json | python3 -c \
  'import json,sys; print(next(t["id"] for t in json.load(sys.stdin) if t["name"]=="portfolio"))')
echo "$TUNNEL_ID"

cp "$HOME/.cloudflared/$TUNNEL_ID.json" infra/cloudflared/credentials.json
sudo chown 65532:65532 infra/cloudflared/credentials.json
sudo chmod 600 infra/cloudflared/credentials.json
ls -l infra/cloudflared/credentials.json   # -rw------- 1 65532 65532
```

Why the `chown`: the container runs as UID `65532` and mounts `./cloudflared` read-only. A `600` file owned by your user is unreadable to it, and `cloudflared` exits with a permission error that looks like a config problem. Owning it by `65532` keeps the file private _and_ readable by the connector. If `sudo` is unavailable, `chmod 644` also works — weaker, but acceptable on a single-user host.

`infra/cloudflared/credentials.json` is already covered by `.gitignore` from Phase 4. Verify before the first commit:

```bash
git check-ignore -v infra/cloudflared/credentials.json   # must print a match
```

Keep a copy of both `~/.cloudflared/cert.pem` and the credentials file somewhere safe (a password manager). Losing them means deleting and recreating the tunnel.

### 5.5 `infra/cloudflared/config.yml`

Replace the Phase 4 placeholders. Substitute the real UUID and domain:

```yaml
tunnel: 0a1b2c3d-4e5f-6789-abcd-ef0123456789
credentials-file: /etc/cloudflared/credentials.json
no-autoupdate: true

# Hostnames resolve to Compose service names on the internal Docker network.
ingress:
  - hostname: example.com
    service: http://web:80
  - hostname: www.example.com
    service: http://web:80
  - hostname: api.example.com
    service: http://api:3000
  - hostname: analytics.example.com
    service: http://umami:3000
  # Required: cloudflared rejects a config whose last rule is not a catch-all.
  - service: http_status:404
```

The paths in this file are **container** paths (`/etc/cloudflared/...`), not host paths — Compose mounts `./cloudflared` there. Validate before starting anything:

```bash
docker run --rm -v "$PWD/infra/cloudflared:/etc/cloudflared:ro" \
  cloudflare/cloudflared:latest tunnel ingress validate --config /etc/cloudflared/config.yml
```

Keep `www` in the ingress even though Cloudflare will redirect it (§5.11): the redirect happens at the edge, and this entry is a harmless fallback if the rule is ever removed.

### 5.6 DNS records

One command per hostname. Each creates a **proxied CNAME** to `<UUID>.cfargotunnel.com`, which is what puts Cloudflare's TLS and CDN in front of the tunnel:

```bash
for host in example.com www.example.com api.example.com analytics.example.com; do
  cloudflared tunnel route dns portfolio "$host"
done
```

If a record already exists (common for the apex on a new zone, which may carry a parking record), add `--overwrite-dns`:

```bash
cloudflared tunnel route dns --overwrite-dns portfolio example.com
```

Verify each resolves to Cloudflare anycast addresses rather than a home IP:

```bash
for host in example.com www.example.com api.example.com analytics.example.com; do
  printf '%s -> %s\n' "$host" "$(dig +short "$host" | tr '\n' ' ')"
done
```

Two addresses in `104.x` / `172.6x` / `188.114.x` ranges (or IPv6 `2606:4700::`) are correct. If `dig` is missing, `sudo apt-get install -y dnsutils`. If the Pi runs Pi-hole as its own resolver, query a public resolver instead (`dig @1.1.1.1 example.com`) so local DNS caching does not confuse the check.

### 5.7 `infra/.env` and `infra/.env.example`

`infra/.env` is untracked and lives only on the Pi. Change these keys — keep `POSTGRES_PASSWORD` and `APP_SECRET` exactly as they are:

```env
# Production values (Phase 5)
CORS_ORIGIN=https://example.com
VITE_API_URL=https://api.example.com
VITE_UMAMI_URL=https://analytics.example.com
VITE_UMAMI_WEBSITE_ID=<from §5.8>

# Start the cloudflared service with a plain `docker compose up -d` on this host.
COMPOSE_PROFILES=tunnel
```

`CORS_ORIGIN` lists only the apex, because `www` never reaches the origin (§5.11). If the `www` redirect is not configured, use `https://example.com,https://www.example.com` instead.

Append the deployment block to the tracked `infra/.env.example`, replacing its "Phase 5 values, for reference" comment block:

```env
# --- Phase 5: production deployment (Pi) ---
# Compose reads this file for CLI settings too: `tunnel` activates the
# cloudflared service, so a plain `docker compose up -d` publishes the site.
# Leave it unset on a dev machine, where there are no tunnel credentials.
COMPOSE_PROFILES=tunnel

# Production values — the VITE_* ones are baked into the web image at build time.
# CORS_ORIGIN=https://example.com
# VITE_API_URL=https://api.example.com
# VITE_UMAMI_URL=https://analytics.example.com
# VITE_UMAMI_WEBSITE_ID=
```

Confirm Compose picked the profile up:

```bash
docker compose -f infra/docker-compose.yml config --services | sort
# cloudflared api postgres umami web  (cloudflared present = profile active)
```

If `cloudflared` is missing, the env var did not take effect; pass `--profile tunnel` explicitly on every command instead.

### 5.8 Umami first, then one web rebuild

`VITE_UMAMI_WEBSITE_ID` is baked into the bundle, and Umami only issues that ID once a website is registered in its dashboard. Doing this **before** the rebuild means building the web image once instead of twice.

Umami is already running and reachable on the Pi's loopback. From your laptop, forward the port over SSH:

```bash
ssh -L 3001:127.0.0.1:3001 joelito@<pi-address>
```

Then open `http://localhost:3001` in your browser:

1. Log in with the Umami defaults: **`admin` / `umami`**.
2. **Change the password immediately** (Settings → Profile). This dashboard is about to be publicly reachable.
3. Settings → Websites → **Add website**. Name: `Portfolio`. Domain: `example.com` (no scheme, no path).
4. Open the new website's settings and copy the **Website ID** (a UUID).
5. Put it in `infra/.env` as `VITE_UMAMI_WEBSITE_ID`.

### 5.9 Real visitor IP: `apps/api/src/common/client-ip.ts`

Behind the tunnel, every request reaches the API from the `cloudflared` container, so `req.ip` is identical for all visitors. `@nestjs/throttler`'s default tracker is exactly `req.ip` (`ThrottlerGuard.getTracker`), which turns a per-visitor limit of 20/min into a **global** 20/min: one bored visitor rate-limits the whole world out of the contact form.

`CF-Connecting-IP` is the right source. Cloudflare always sets it to the true client address and **overwrites** any value the client supplied, unlike `X-Forwarded-For`, which Cloudflare appends to — meaning a client can prepend a fake entry there and a naive `req.ips[0]` would trust it.

```ts
const CF_CONNECTING_IP = "cf-connecting-ip";

/**
 * Cloudflare overwrites CF-Connecting-IP, so it cannot be spoofed by the client;
 * X-Forwarded-For is only appended to and therefore is not safe to trust here.
 * The fallback matters for local runs and tests, where the header is absent.
 */
export function getClientIp(req: Record<string, unknown>): string {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const header = headers[CF_CONNECTING_IP];
  const candidate = (Array.isArray(header) ? header[0] : header)?.trim();

  if (candidate) {
    return candidate;
  }

  return typeof req.ip === "string" && req.ip.length > 0 ? req.ip : "unknown";
}
```

Wire it into the existing throttler options in `apps/api/src/app.module.ts`. `@nestjs/throttler` 6.x honours a per-throttler `getTracker`, so this is a two-line change and no new guard class:

```ts
import { getClientIp } from "./common/client-ip";

ThrottlerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => [
    {
      ttl: Number(config.get("THROTTLE_TTL_MS", 60_000)),
      limit: Number(config.get("THROTTLE_LIMIT", 20)),
      getTracker: (req: Record<string, unknown>) => getClientIp(req),
    },
  ],
}),
```

`apps/api/src/common/client-ip.test.ts` — a pure function, so a plain Vitest unit test:

```ts
import { describe, expect, it } from "vitest";

import { getClientIp } from "./client-ip";

describe("getClientIp", () => {
  it("prefers CF-Connecting-IP over the socket address", () => {
    expect(getClientIp({ headers: { "cf-connecting-ip": "203.0.113.7" }, ip: "172.18.0.5" })).toBe(
      "203.0.113.7",
    );
  });

  it("ignores a spoofable X-Forwarded-For", () => {
    expect(getClientIp({ headers: { "x-forwarded-for": "1.2.3.4" }, ip: "172.18.0.5" })).toBe(
      "172.18.0.5",
    );
  });

  it("falls back to req.ip when the header is absent or blank", () => {
    expect(getClientIp({ headers: {}, ip: "127.0.0.1" })).toBe("127.0.0.1");
    expect(getClientIp({ headers: { "cf-connecting-ip": "  " }, ip: "127.0.0.1" })).toBe(
      "127.0.0.1",
    );
  });

  it("never returns undefined", () => {
    expect(getClientIp({})).toBe("unknown");
  });
});
```

### 5.10 `infra/nginx.conf` — real visitor IP in access logs

Same problem, different symptom: every line in nginx's access log shows the `cloudflared` container's address. Add this block inside `server { ... }`, just after `index index.html;`:

```nginx
    # Behind Cloudflare Tunnel the peer is always the cloudflared container, so
    # trust only private ranges as the proxy and take the visitor IP from the
    # header Cloudflare guarantees.
    set_real_ip_from 10.0.0.0/8;
    set_real_ip_from 172.16.0.0/12;
    set_real_ip_from 192.168.0.0/16;
    real_ip_header CF-Connecting-IP;
```

The `realip` module is compiled into the official `nginx:1.27-alpine` image, so no image change is needed. Only private ranges are trusted, so nothing outside the Docker network can set the header. Verify after deploying:

```bash
docker compose -f infra/docker-compose.yml logs --tail 5 web
# request lines start with a public visitor IP, not 172.x
```

### 5.11 Cloudflare zone settings

All in the dashboard, under the domain. Each is one click.

| Setting                                               | Value             | Why                                                                                                                                                                                                                                           |
| ----------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SSL/TLS → Overview → encryption mode                  | **Full (strict)** | Never **Flexible**: it is the classic cause of redirect loops, and it advertises an unencrypted origin hop. The Cloudflare→connector hop is encrypted regardless, so strict is safe even though the ingress targets plain HTTP inside Docker. |
| SSL/TLS → Edge Certificates → **Always Use HTTPS**    | On                | 301s any `http://` request at the edge. nginx does no redirecting, so this is the only place it happens — and therefore no loop is possible.                                                                                                  |
| SSL/TLS → Edge Certificates → **Minimum TLS Version** | 1.2               | Drops TLS 1.0/1.1 clients; no realistic visitor impact.                                                                                                                                                                                       |
| Rules → **Redirect Rules** → new rule                 | `www` → apex, 301 | One canonical hostname keeps CORS, analytics, and SEO simple. Free plan allows 10 such rules.                                                                                                                                                 |
| Speed → Optimization → **Rocket Loader**              | Off (default)     | It defers and reorders scripts, which breaks React bundles in ways that are painful to debug.                                                                                                                                                 |
| Security → Bots → **Bot Fight Mode**                  | Off (default)     | It challenges non-browser clients, which would break `curl` health checks and can interfere with Umami's tracking POSTs.                                                                                                                      |
| SSL/TLS → Edge Certificates → **HSTS**                | Leave off         | Enable later, deliberately. A max-age is not revocable: browsers refuse plain HTTP for the domain until it expires, so a mistake is a long outage.                                                                                            |

The `www` → apex redirect rule, concretely: **Rules → Redirect Rules → Create rule**, custom filter expression `Hostname equals www.example.com`, then a dynamic redirect to `concat("https://example.com", http.request.uri.path)` with status **301** and "Preserve query string" enabled.

Caching needs no change: Cloudflare's default rules cache static extensions only, so JSON from `api.example.com` is not cached, and nginx already sends `no-cache` for `index.html` plus a one-year lifetime for content-hashed `/assets`.

### 5.12 Nightly database backup

Postgres holds the contact submissions and all Umami history in one volume. A dump is the difference between "restore last night" and "start over".

`infra/scripts/pg-backup.sh`:

```sh
#!/bin/sh
set -eu

BACKUP_DIR=${BACKUP_DIR:-/var/backups/portfolio}
RETENTION_DAYS=${RETENTION_DAYS:-14}
CONTAINER=${CONTAINER:-portfolio-pg}
DB_USER=${DB_USER:-portfolio}

stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$BACKUP_DIR"

# Write to a dot-prefixed temp name and rename: a dump interrupted mid-write
# must never be mistaken for a complete one by the restore procedure.
tmp="$BACKUP_DIR/.pg_dumpall-$stamp.sql.gz"
out="$BACKUP_DIR/pg_dumpall-$stamp.sql.gz"

# pg_dumpall covers both databases (portfolio + umami) and the roles.
# It connects over the container's unix socket, which the postgres image
# trusts, so no password is needed here.
docker exec "$CONTAINER" pg_dumpall -U "$DB_USER" | gzip -9 >"$tmp"
mv "$tmp" "$out"

find "$BACKUP_DIR" -maxdepth 1 -name 'pg_dumpall-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -name '.pg_dumpall-*.sql.gz' -mtime +1 -delete

echo "[pg-backup] wrote $out ($(du -h "$out" | cut -f1))"
```

`infra/systemd/portfolio-pg-backup.service`:

```ini
[Unit]
Description=Dump the portfolio Postgres cluster
Documentation=https://github.com/Joelitooo/about-me
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
EnvironmentFile=-/etc/default/portfolio-pg-backup
ExecStart=/usr/local/bin/portfolio-pg-backup
```

`infra/systemd/portfolio-pg-backup.timer`:

```ini
[Unit]
Description=Nightly portfolio Postgres dump

[Timer]
OnCalendar=*-*-* 03:30:00
# Catch up after downtime instead of silently skipping a night.
Persistent=true
RandomizedDelaySec=15m

[Install]
WantedBy=timers.target
```

Install, then prove it works:

```bash
sudo install -m 0755 infra/scripts/pg-backup.sh /usr/local/bin/portfolio-pg-backup
sudo install -m 0644 infra/systemd/portfolio-pg-backup.service /etc/systemd/system/
sudo install -m 0644 infra/systemd/portfolio-pg-backup.timer   /etc/systemd/system/
sudo install -d -m 0700 /var/backups/portfolio
sudo systemctl daemon-reload
sudo systemctl enable --now portfolio-pg-backup.timer

sudo systemctl start portfolio-pg-backup.service    # run one now
sudo systemctl status portfolio-pg-backup.service --no-pager
sudo systemctl list-timers portfolio-pg-backup.timer --no-pager
```

Verify the dump is real rather than an empty gzip:

```bash
latest=$(sudo ls -t /var/backups/portfolio/pg_dumpall-*.sql.gz | head -1)
sudo zgrep -c 'CREATE DATABASE' "$latest"     # >= 2 (portfolio + umami)
sudo zgrep -c 'contact_messages' "$latest"    # >= 1
```

Restore procedure, for the record (destructive — it replaces the cluster contents):

```bash
gunzip -c /var/backups/portfolio/pg_dumpall-<stamp>.sql.gz \
  | docker exec -i portfolio-pg psql -U portfolio -d postgres
```

### 5.13 `README.md` (update)

Add a `## Deployment` section after `## Docker`:

> **## Deployment**
>
> The stack runs on a Raspberry Pi (Ubuntu Server 24.04, arm64) and is published through a Cloudflare Tunnel — no router port is forwarded. `infra/cloudflared/config.yml` maps each hostname to a Compose service; `infra/cloudflared/credentials.json` is a secret and is gitignored.
>
> ```bash
> docker compose -f infra/docker-compose.yml build web   # after changing any VITE_* value
> docker compose -f infra/docker-compose.yml up -d       # includes cloudflared via COMPOSE_PROFILES=tunnel
> docker compose -f infra/docker-compose.yml logs -f cloudflared
> cloudflared tunnel info portfolio                      # connector status
> sudo systemctl list-timers portfolio-pg-backup.timer   # nightly database dump
> ```
>
> Full setup — Cloudflare account, tunnel creation, DNS, host hardening, backups — is in [`phases/phase-5/spec.md`](phases/phase-5/spec.md).

## 6. Execution order (commands)

Run from `/home/joelito/about-me` on the Pi.

```bash
# 0. Branch
git checkout -b feature/phase-5

# 1. Host checks (§3.1) — fix anything that fails before continuing
docker compose -f infra/docker-compose.yml ps

# 2. Docker log rotation (§5.1)
sudo install -m 0644 infra/docker/daemon.json /etc/docker/daemon.json
sudo systemctl restart docker
docker info --format '{{.LoggingDriver}}'

# 3. Firewall (§5.2) — the SSH rule comes first
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow OpenSSH && sudo ufw --force enable

# 4. cloudflared CLI (§5.3)
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared noble main' \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared

# 5. Tunnel + credentials (§5.4) — step one is interactive
cloudflared tunnel login
cloudflared tunnel create portfolio
TUNNEL_ID=$(cloudflared tunnel list --output json | python3 -c \
  'import json,sys; print(next(t["id"] for t in json.load(sys.stdin) if t["name"]=="portfolio"))')
cp "$HOME/.cloudflared/$TUNNEL_ID.json" infra/cloudflared/credentials.json
sudo chown 65532:65532 infra/cloudflared/credentials.json
sudo chmod 600 infra/cloudflared/credentials.json
git check-ignore -v infra/cloudflared/credentials.json

# 6. Ingress config (§5.5) — edit in the UUID and the real domain, then validate
docker run --rm -v "$PWD/infra/cloudflared:/etc/cloudflared:ro" \
  cloudflare/cloudflared:latest tunnel ingress validate --config /etc/cloudflared/config.yml

# 7. DNS (§5.6)
for host in example.com www.example.com api.example.com analytics.example.com; do
  cloudflared tunnel route dns portfolio "$host"
done

# 8. Umami website ID (§5.8) — via `ssh -L 3001:127.0.0.1:3001` from your laptop

# 9. Env (§5.7): production CORS_ORIGIN, VITE_*, COMPOSE_PROFILES=tunnel
docker compose -f infra/docker-compose.yml config --services | sort   # cloudflared listed

# 10. Code changes (§5.9, §5.10), then verify locally
pnpm typecheck && pnpm lint && pnpm test

# 11. Rebuild with production build args and start everything
docker compose -f infra/docker-compose.yml build web api
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps          # five services, healthy
docker compose -f infra/docker-compose.yml logs cloudflared | grep -i 'Registered tunnel connection'

# 12. Cloudflare dashboard settings (§5.11)

# 13. Backups (§5.12)
sudo install -m 0755 infra/scripts/pg-backup.sh /usr/local/bin/portfolio-pg-backup
sudo install -m 0644 infra/systemd/portfolio-pg-backup.{service,timer} /etc/systemd/system/
sudo install -d -m 0700 /var/backups/portfolio
sudo systemctl daemon-reload && sudo systemctl enable --now portfolio-pg-backup.timer
sudo systemctl start portfolio-pg-backup.service

# 14. End-to-end verification (§8)

# 15. Reboot test
sudo reboot
# after it comes back:
docker compose -f infra/docker-compose.yml ps
curl -sf -o /dev/null -w '%{http_code}\n' https://example.com

# 16. Commit (credentials.json is gitignored and must NOT appear here)
git add apps/api README.md infra/.env.example infra/nginx.conf infra/cloudflared/config.yml \
        infra/docker infra/scripts infra/systemd phases/phase-5
git status   # confirm infra/cloudflared/credentials.json is absent
git commit -m "feat(infra): publish the stack via Cloudflare Tunnel on the Pi (phase 5)"
```

## 7. Acceptance criteria

Phase 5 is complete when **all** of the following hold:

- [ ] `docker info` reports the `json-file` driver, and `docker inspect portfolio-api` shows `max-size: 10m`, `max-file: 3`.
- [ ] `ufw status` is `active` with OpenSSH allowed, and `docker compose ps` shows every published port bound to `127.0.0.1`.
- [ ] `cloudflared tunnel info portfolio` reports exactly **one** connector (the container — no host service).
- [ ] `infra/cloudflared/config.yml` contains the real tunnel UUID and all four hostnames, and `tunnel ingress validate` passes.
- [ ] `infra/cloudflared/credentials.json` exists, is owned by `65532`, and is **not** tracked by git.
- [ ] All four hostnames resolve to Cloudflare addresses and are proxied.
- [ ] `https://example.com` serves the SPA with a valid certificate; `https://example.com/some/deep/link` returns 200 and the SPA renders that route.
- [ ] `http://example.com` 301-redirects to `https://` (Always Use HTTPS), with no redirect loop.
- [ ] `https://www.example.com` 301-redirects to the apex, preserving path and query.
- [ ] `https://api.example.com/health` returns `{"status":"ok"}`.
- [ ] The contact form submits successfully from `https://example.com` with no CORS error in the browser console, and the row is present in `contact_messages`.
- [ ] `https://analytics.example.com` shows the Umami login, the default `admin`/`umami` password no longer works, and a visit to the live site appears in the dashboard within a minute.
- [ ] Rate limiting is per visitor: two different `CF-Connecting-IP` values get independent budgets (§8).
- [ ] `docker compose logs web` shows public visitor IPs, not `172.x` container addresses.
- [ ] `/var/backups/portfolio` holds a dump containing at least two `CREATE DATABASE` statements, and `portfolio-pg-backup.timer` is enabled with a scheduled next run.
- [ ] After `sudo reboot`, all five containers return automatically and `https://example.com` responds with no manual step.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass, including the new `client-ip` test.
- [ ] No port forwarding rule exists on the router.

## 8. Verification

Phase 5 adds one unit test (`client-ip.test.ts`); everything else is verified against the live deployment.

**From the Pi** (this still exercises the full path — out to Cloudflare and back through the tunnel):

```bash
curl -sI https://example.com | head -3                                   # HTTP/2 200
curl -s -o /dev/null -w '%{http_code}\n' https://example.com/pt/projects # 200
curl -sI http://example.com | grep -i location                           # https://example.com/
curl -sI https://www.example.com | grep -iE '^(HTTP|location)'           # 301 -> apex
curl -s https://api.example.com/health                                   # {"status":"ok"}
curl -sf https://analytics.example.com/api/heartbeat                     # ok
```

**From outside the LAN** — a phone on mobile data, loading `https://example.com`. This is the only check that proves the tunnel, not the local network, is serving the site.

**Per-visitor rate limiting.** Spoofing `CF-Connecting-IP` is only possible from inside the Docker network (Cloudflare overwrites it for real traffic), which is exactly what makes it testable locally:

```bash
# Two distinct trackers, each with its own budget.
for i in $(seq 1 25); do
  curl -s -o /dev/null -w '%{http_code} ' -H 'CF-Connecting-IP: 203.0.113.1' \
    -X POST http://127.0.0.1:3000/contact -H 'Content-Type: application/json' -d '{}'
done; echo
curl -s -o /dev/null -w 'other visitor: %{http_code}\n' -H 'CF-Connecting-IP: 203.0.113.99' \
  -X POST http://127.0.0.1:3000/contact -H 'Content-Type: application/json' -d '{}'
```

The first loop should reach `429` once the limit is exhausted; the second address must still get a normal validation response (`400` for the empty body) rather than `429`. Before this change, it would have been `429` too.

**Deep-link and asset headers** are unchanged from Phase 4 and covered by that spec; re-run them through the public hostname to confirm Cloudflare did not alter caching:

```bash
curl -sI https://example.com/assets/ -o /dev/null -w '%{http_code}\n'
curl -sI https://example.com | grep -iE 'cache-control|cf-cache-status'
```

**Existing suites are unaffected.** `pnpm test` must stay green without the stack running; the API's Testcontainers tests still run on the host against the Docker socket.

## 9. Notes & decisions

- **Locally-managed tunnel over a dashboard token.** A token-based (remotely-managed) tunnel is fewer steps — create it in the Zero Trust dashboard, paste `TUNNEL_TOKEN` into `.env` — but the ingress rules then live only in Cloudflare's UI, invisible to code review and absent from a fresh clone. `MAIN_PLAN.md` specified `config.yml`, and the CLI path also avoids Zero Trust onboarding entirely. Token mode remains a valid fallback: swap the compose command for `tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}` and configure public hostnames in the dashboard.
- **`CF-Connecting-IP`, not `X-Forwarded-For`.** Cloudflare overwrites the former and appends to the latter. Enabling Express's `trust proxy` and reading `req.ips[0]` would let a client prepend a fake address and mint a fresh rate-limit bucket per request. The tunnel is the only ingress, so the header is trustworthy — but only that specific header.
- **No compose changes.** Phase 4 already defined `cloudflared` behind a `tunnel` profile, and `COMPOSE_PROFILES=tunnel` in `infra/.env` activates it per-host. That keeps one compose file valid on both a dev machine (no credentials, tunnel skipped) and the Pi.
- **Loopback ports stay published.** Phase 4 left open whether to drop them. They are kept: they cost nothing, they are unreachable from the LAN, and they are what makes the local rate-limit test and the Umami SSH port-forward possible.
- **Full (strict) with a plain-HTTP ingress is not a contradiction.** The encryption mode governs the Cloudflare→origin hop, and for tunnel traffic that hop is the connector's own TLS connection. The unencrypted leg is `cloudflared` → `web` inside the Pi's Docker network. Flexible mode is the one to avoid: it is the standard cause of `ERR_TOO_MANY_REDIRECTS` behind a tunnel.
- **Umami's dashboard is left publicly reachable**, protected only by its own login. Putting Cloudflare Access in front of `analytics.example.com` is stronger (email one-time-PIN before the origin is even reached) but requires Zero Trust onboarding, a team domain, and an Access policy — disproportionate for a single-user analytics dashboard, and easy to add later without touching this stack.
- **Backups sit on the same disk as the data.** That covers bad migrations, `docker compose down -v`, and accidental deletion, but not SD card failure. The Pi boots from `/dev/mmcblk0`, so an SD failure loses the dumps too. Copying `/var/backups/portfolio` off-box (`rsync` over SSH, or an object store) is the obvious next step and belongs with Phase 6 automation.
- **No swap is configured, and none is added.** 8 GB of RAM builds the Vite and Nest images comfortably, and swapping onto an SD card costs write endurance for little benefit. If a build ever gets OOM-killed, prefer `zram` (`systemd-zram-generator`) over a swapfile on flash.
- **QUIC may be blocked.** `cloudflared` prefers UDP 7844 and falls back to HTTP/2 over TCP on its own. If the logs show repeated QUIC failures, pin the transport by adding `protocol: http2` to `config.yml`.
- **`cloudflared:latest` stays floating**, matching the Phase 4 decision: tunnel client fixes arrive automatically, and the connector is stateless enough that a surprise upgrade is low-risk. `docker compose pull cloudflared && docker compose up -d cloudflared` applies one on purpose.
- **Nothing else may claim ports 80/443 or 53 on the host.** The Pi has a `pihole/pihole` image on disk; if that container is ever started, keep it on distinct ports so it does not collide with this stack.
- **The reboot test is not optional.** `restart: unless-stopped` plus an enabled `docker` service is the entire high-availability story here, and a container that was started ad-hoc rather than by Compose will silently fail to return. Verifying it once is the only way to know.
