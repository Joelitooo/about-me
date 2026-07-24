# Phase 1 - Frontend SPA (`apps/web`)

> Part of the [Portfolio Fullstack Monorepo](../MAIN_PLAN.md) plan.

- Scaffold Vite React TS; add Tailwind, `react-router-dom`, `i18next` (EN/PT/PL), and TanStack Query for data fetching.
- Build dynamic sections: hero, about, skills, projects (later from GitHub API), resume PDF download, contact form.
- Dark mode, responsive layout, a small typed API client pointing at the NestJS API.
- **Testing:** register `apps/web` in the root Vitest workspace with `jsdom` + React Testing Library; component/unit tests co-located as `*.test.tsx`. Add Playwright for E2E under `apps/web/e2e/`.
