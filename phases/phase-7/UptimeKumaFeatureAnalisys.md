# Live uptime from Uptime Kuma - feature analysis

> Deferred out of [Phase 7](plan.md) on 2026-08-03 and parked here for a future phase. Nothing in this document is implemented. It captures the research so the feature can be picked up later without redoing the investigation.

**Feature:** show the site's real, live uptime percentage on the public page, sourced from the self-hosted Uptime Kuma instance.

**Why it was proposed:** the Phase 7 "live proof" strip states that this site runs on a Raspberry Pi behind Cloudflare Tunnel with CI/CD. A real uptime figure turns that from a claim into evidence — for a mid-level candidate, "I built and operate this, and here is its measured availability" is checkable in a way almost nothing else on a portfolio is.

**Why it was deferred:** it is the only cross-app piece in an otherwise frontend-only phase (API + shared package + infra), and it depends on a manual Kuma configuration step on the Pi. Splitting it keeps the redesign reviewable.

## 1. Current state — verified in the repo

| Fact          | Source                              | Detail                                                                                                     |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Service name  | `infra/docker-compose.yml` line 95  | `uptime-kuma`, container `portfolio-uptime-kuma`                                                           |
| Image         | `infra/docker-compose.yml` line 96  | `louislam/uptime-kuma:1`, SHA-pinned                                                                       |
| Ports         | `infra/docker-compose.yml` line 101 | `127.0.0.1:${KUMA_PORT:-3002}:3001` — container listens on **3001**, host binding is loopback-only on 3002 |
| Profile       | `infra/docker-compose.yml` line 99  | `profiles: ["monitoring"]`                                                                                 |
| Enabled where | `infra/.env.example` line 51        | `COMPOSE_PROFILES=tunnel,monitoring` — the Pi only                                                         |
| Public route  | `infra/cloudflared/config.yml`      | **None.** Ingress covers web, api, and umami only                                                          |
| Network       | `infra/docker-compose.yml`          | No custom networks, so all services share the compose default and resolve each other by service name       |
| CSP           | `infra/nginx.conf` line 18          | `connect-src 'self' https://api.joelitoo.com https://analytics.joelitoo.com`                               |

Two consequences drive the whole design:

1. **Kuma has no public route and should not get one.** It is an admin dashboard; exposing it to add a number to a portfolio would be a poor trade.
2. **Kuma is profile-gated**, so it does not run in local dev or CI. Any code path touching it must treat absence as the normal case, not an error.

## 2. Recommended approach — proxy through the API

The browser never talks to Kuma. `apps/api` fetches from it inside the compose network and exposes a small, typed, cached endpoint.

Alternatives considered and rejected:

| Option                              | Why not                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Expose Kuma through cloudflared     | Puts an admin UI on the public internet for a cosmetic gain.                           |
| Call Kuma directly from the browser | Impossible without exposing it, and would need a CSP change plus CORS handling.        |
| Hardcode a number                   | It would be a claim, not evidence — which defeats the entire purpose.                  |
| Kuma's Prometheus `/metrics`        | Requires an API key and returns far more than needed; the status-page JSON is simpler. |

Proxying also buys caching, a stable contract independent of Kuma's internals, and no CSP change — `connect-src` already permits `https://api.joelitoo.com`.

## 3. Kuma configuration (manual, one-off, on the Pi)

Create a **published status page** with slug `portfolio` containing the `web` and `api` monitors. A published status page serves unauthenticated JSON, which avoids Kuma's socket.io-only admin API and needs no API key:

- `GET /api/status-page/portfolio` — page configuration and monitor list
- `GET /api/status-page/heartbeat/portfolio` — `heartbeatList` plus `uptimeList`, keyed as `<monitorId>_24` with values from 0 to 1

Publishing only makes the page readable to whoever can already reach Kuma, which remains loopback plus the compose network. This step is a prerequisite: until it exists, the endpoint below correctly returns `unknown`.

**To verify before building:** confirm the exact JSON shape against the pinned image, since these paths are Kuma 1.x internals rather than a documented stable API. That version-coupling is the main maintenance risk in the feature — a Kuma 2.x upgrade could change the payload, which is another argument for keeping the parsing isolated in one service with tests.

## 4. Shared contract

Add to `packages/shared/src/index.ts`:

```ts
/** Public uptime summary, proxied from Uptime Kuma by the API. */
export interface UptimeStatus {
  status: "ok" | "degraded" | "down" | "unknown";
  uptime24h: number | null; // 0–1
  uptime30d: number | null; // 0–1
  checkedAt: string; // ISO 8601
}
```

Keep this separate from the existing `HealthStatus`, which describes the API's own liveness. Conflating "am I alive right now" with "how has the stack behaved for 30 days" would muddle both contracts.

## 5. API — `UptimeModule`

New `apps/api/src/uptime/{uptime.module,uptime.controller,uptime.service,uptime.service.test}.ts`, mirroring the existing `health/` and `contact/` module shape. `GET /uptime` returns `UptimeStatus`.

- **Native `fetch`** (Node 22) — no new dependency, and it matches the style of `apps/web/src/lib/apiClient.ts`. No `HttpModule`, no axios.
- **2s timeout** via `AbortSignal.timeout(2000)`. A status widget must never hold an API request open.
- **60s in-memory cache.** Uptime changes no faster than Kuma's check interval, and visitors refreshing shouldn't stack up requests. A module-scoped timestamp plus value is sufficient; no `CacheModule` dependency.
- **It must never throw.** On timeout, DNS failure, non-200, or unexpected payload shape, return `status: "unknown"` with null ratios and **HTTP 200**.
- **Config** via the existing `ConfigService`: `KUMA_BASE_URL` (default `http://uptime-kuma:3001` — the container port, _not_ the 3002 host binding) and `KUMA_STATUS_PAGE_SLUG` (default `portfolio`). If `KUMA_BASE_URL` is empty, skip the fetch entirely and return `unknown`; that is the clean local-dev path.
- **Status derivation:** `ok` when all monitors are up, `degraded` when some are down, `down` when all are, `unknown` when there is no usable data.
- The global `ThrottlerGuard` in `apps/api/src/app.module.ts` already covers the route; confirm its default limit is sensible for an unauthenticated GET.

**The never-throw rule is the most important requirement in this feature.** Because `monitoring` is off by default, the service name will not even resolve in local dev or CI. A monitoring nicety must not be able to break the API or the page in every environment except production.

## 6. Infra

Add `KUMA_BASE_URL` and `KUMA_STATUS_PAGE_SLUG` to `infra/.env.example` and to the `api` service environment in `infra/docker-compose.yml`.

**Do not add `depends_on: uptime-kuma`.** Kuma is profile-gated, so a hard dependency breaks `docker compose up` whenever `monitoring` is off. The services already share the default compose network, so service-name DNS resolves once the profile is enabled.

## 7. Frontend integration

Add `getUptimeStatus()` to `apps/web/src/lib/apiClient.ts` alongside `postContactMessage`, consumed by the live-proof strip through TanStack Query with `staleTime` of 5 minutes and `retry: false`.

- The static stack line renders immediately and unconditionally. The uptime figure appends only once data arrives and `status !== "unknown"`, so a missing feed degrades to exactly the static strip rather than an error or a spinner.
- Reserve the inline space, or append at the end of the line, so arriving data causes no layout shift.
- Render as `99.98% uptime (30d)` with a small status dot. Style `degraded` with the warning colour rather than hiding it.

## 8. Testing

- `uptime.service.test.ts` with mocked `fetch`: ok, degraded, timeout, malformed payload, and profile-off (unresolvable host).
- A frontend test asserting the strip still renders its static facts when the query fails.
- E2E must not assert on live uptime — CI runs without Kuma.

## 9. Open decisions

1. **The honesty floor.** A figure below roughly 99% actively undermines the point it is making, and a home internet connection will blip. Either show the status dot without a percentage below a chosen floor, or always show the real number and accept it. This is a self-inflicted claim on a hiring page, so a bad month should not be able to argue against you. Decide before shipping, not after.
2. **Which monitors count.** Including the API in the figure means an API deploy blip lowers a number that most visitors will read as "is the website up".
3. **Whether 30d or 24h is the headline.** 30d is more meaningful and more forgiving of a single bad day.
4. **Kuma version coupling** — see §3. Worth deciding whether the feature is worth re-verifying on each Kuma major upgrade.

## 10. Effort estimate

Roughly half a day of implementation: the shared type and the Nest module with tests are small and self-contained, the frontend hook is a few lines, and the infra change is two env vars. The manual Kuma status-page setup and the production verification pass are the parts that need access to the Pi.
