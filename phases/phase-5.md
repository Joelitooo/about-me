# Phase 5 - Deployment on the Pi + Cloudflare Tunnel

> Part of the [Portfolio Fullstack Monorepo](../MAIN_PLAN.md) plan.

- Install Docker + Compose on Ubuntu Server; create a Cloudflare Tunnel and `cloudflared/config.yml` ingress rules mapping subdomains to the containers.
- Point the purchased domain DNS at the tunnel; bring the stack up with `docker compose up -d`.
