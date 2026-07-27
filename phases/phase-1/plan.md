# Phase 1 - Frontend SPA (`apps/web`)

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. Technical details live in [`spec.md`](spec.md).

**Goal:** a production-ready Vite + React SPA with Tailwind CSS, client-side routing, i18n (EN/PT/PL), dark mode, TanStack Query, portfolio sections (hero, about, skills, projects, resume, contact), a typed API client pointing at the future NestJS API, and a testing layer (Vitest + RTL + Playwright).

## Prerequisites

- Phase 0 complete: pnpm monorepo, `packages/shared`, root Vitest workspace, ESLint/Prettier baseline.
- A minimal `apps/web` scaffold already exists (React 19 + Vite 5). Phase 1 extends it — do not re-scaffold from scratch.

## Steps

1. **Dependencies** — add Tailwind v4 (`tailwindcss`, `@tailwindcss/vite`), `react-router`, `i18next` + `react-i18next` + `i18next-browser-languagedetector`, `@tanstack/react-query`, and `@portfolio/shared` as a workspace dependency. Dev: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@playwright/test`.
2. **Tailwind v4** — register `@tailwindcss/vite` in `vite.config.ts`; create `src/index.css` with `@import "tailwindcss"`, `@custom-variant dark`, and `@theme` design tokens.
3. **Router** — set up React Router v7 data router (`createBrowserRouter` + `RouterProvider`) with a root layout and home route.
4. **i18n** — configure i18next with browser language detection; add EN/PT/PL locale JSON files and wire a locale switcher in the navbar.
5. **Theme / dark mode** — add a no-flash inline script in `index.html`, a `ThemeProvider` that toggles `.dark` on `<html>`, and persist preference in `localStorage`.
6. **API client + TanStack Query** — create a typed fetch wrapper using `@shared` DTOs and `VITE_API_URL`; wrap the app in `QueryClientProvider`. Contact form posts `ContactMessageDto` (gracefully handles API not yet running).
7. **Layout & sections** — build `Layout`, `Navbar`, `Footer`, and section components: Hero, About, Skills, Projects (static placeholder data), Resume (PDF download), Contact (validated form).
8. **Unit / component tests** — register `apps/web` in the root `vitest.workspace.ts` (jsdom + RTL setup); add co-located `*.test.tsx` files (at least one sample test).
9. **Playwright E2E** — add `playwright.config.ts` and a smoke test under `apps/web/e2e/` that verifies the home page renders.
10. **Verify** — run `pnpm install`, `pnpm --filter @portfolio/web dev` (manual check), `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter @portfolio/web build`, then commit.

## Deliverables

```
apps/web/
  e2e/
    home.spec.ts
  public/
    resume.pdf                 # placeholder PDF
  src/
    components/
      Layout.tsx
      Navbar.tsx
      Footer.tsx
    sections/
      Hero.tsx
      About.tsx
      Skills.tsx
      Projects.tsx
      Resume.tsx
      Contact.tsx
      Hero.test.tsx
    i18n/
      config.ts
      locales/en.json
      locales/pt.json
      locales/pl.json
    lib/
      apiClient.ts
      queryClient.ts
    theme/
      ThemeProvider.tsx
    routes/
      Home.tsx
    test/
      setup.ts
    App.tsx
    main.tsx
    router.tsx
    index.css
    vite-env.d.ts
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  playwright.config.ts
  .env.example
```

Also update root `vitest.workspace.ts` to append the `web` project.

## Done when

`pnpm --filter @portfolio/web dev` serves the SPA with all sections, dark mode toggles, three locales switch, `pnpm typecheck` / `pnpm lint` / `pnpm test` pass (including the web Vitest project), `pnpm --filter @portfolio/web build` succeeds, and the Playwright smoke test passes.

## Task checklist

- [ ] Dependencies installed (`tailwindcss`, router, i18n, TanStack Query, testing libs)
- [ ] Tailwind v4 wired via `@tailwindcss/vite` + `index.css` with dark mode variant
- [ ] React Router v7 data router with layout + home route
- [ ] i18next configured with EN/PT/PL locale files and navbar switcher
- [ ] Dark mode: no-flash script, `ThemeProvider`, `.dark` class toggle
- [ ] Typed API client + TanStack Query provider (uses `@portfolio/shared` DTOs)
- [ ] Layout, Navbar, Footer, and all six section components
- [ ] Contact form validates and posts `ContactMessageDto`
- [ ] Vitest workspace updated; at least one RTL component test passes
- [ ] Playwright config + smoke E2E test
- [ ] `pnpm typecheck` / `lint` / `test` / `build` pass and committed
