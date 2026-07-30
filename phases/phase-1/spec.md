# Phase 1 - Technical Specification

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. High-level overview in [`plan.md`](plan.md).

This document is the implementation contract for Phase 1. It is written for an agent (or developer) to follow top-to-bottom. Each section gives the exact file path, its full contents (for config/infra) or representative skeleton (for section components), and the commands to run. Phase 1 builds on the existing minimal `apps/web` scaffold — do not re-scaffold from scratch.

---

## 1. Scope

**In scope**

- Extend `apps/web` with Tailwind CSS v4, React Router v7, i18next (EN/PT/PL), dark mode, TanStack Query.
- Portfolio sections: hero, about, skills, projects (static placeholder data), resume PDF download, contact form.
- Typed API client using `@portfolio/shared` DTOs and `VITE_API_URL`.
- Responsive layout with dark mode toggle and locale switcher.
- Register `apps/web` in the root Vitest workspace (jsdom + React Testing Library).
- Playwright E2E smoke test under `apps/web/e2e/`.

**Out of scope (later phases)**

- Real GitHub API integration for projects (Phase 1 uses static placeholder data).
- Backend API endpoints (Phase 2) — the contact form posts to the API but gracefully handles it not running yet.
- Umami analytics script (Phase 3).
- Docker, deployment, CI (Phases 4–6).

## 2. Conventions

- **Package manager:** pnpm (via Corepack). Never use `npm`/`yarn` in this repo.
- **Language:** TypeScript, ESM (`"type": "module"`), `strict` mode on.
- **Imports:** use `.js` extension in TypeScript import specifiers (matches `verbatimModuleSyntax` from Phase 0).
- **Shared types:** import from `@portfolio/shared` (workspace package) or `@shared/*` path alias.
- **Component tests:** co-locate as `*.test.tsx` next to the component under test.
- **E2E tests:** live in `apps/web/e2e/`.
- **Env vars:** prefixed with `VITE_` for client-side access via `import.meta.env`.

## 3. Prerequisites

1. Phase 0 complete: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass.
2. The minimal `apps/web` scaffold exists (React 19 + Vite 5 + `@vitejs/plugin-react`).
3. Create a feature branch before making any changes:

```bash
git checkout -b feature/phase-1
```

All Phase 1 work happens on this branch. Do not commit directly to `main`.

## 4. Target file tree

```
about-me/
├── apps/
│   └── web/
│       ├── e2e/
│       │   └── home.spec.ts
│       ├── public/
│       │   └── resume.pdf              # placeholder (any small PDF)
│       ├── src/
│       │   ├── components/
│       │   │   ├── Layout.tsx
│       │   │   ├── Navbar.tsx
│       │   │   └── Footer.tsx
│       │   ├── sections/
│       │   │   ├── Hero.tsx
│       │   │   ├── Hero.test.tsx
│       │   │   ├── About.tsx
│       │   │   ├── Skills.tsx
│       │   │   ├── Projects.tsx
│       │   │   ├── Resume.tsx
│       │   │   └── Contact.tsx
│       │   ├── i18n/
│       │   │   ├── config.ts
│       │   │   └── locales/
│       │   │       ├── en.json
│       │   │       ├── pt.json
│       │   │       └── pl.json
│       │   ├── lib/
│       │   │   ├── apiClient.ts
│       │   │   └── queryClient.ts
│       │   ├── theme/
│       │   │   └── ThemeProvider.tsx
│       │   ├── routes/
│       │   │   └── Home.tsx
│       │   ├── test/
│       │   │   └── setup.ts
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── router.tsx
│       │   ├── index.css
│       │   └── vite-env.d.ts
│       ├── .env.example
│       ├── index.html
│       ├── package.json
│       ├── playwright.config.ts
│       ├── tsconfig.json
│       └── vite.config.ts
└── vitest.workspace.ts                 # append web project
```

## 5. File-by-file specification

Create or update each file as specified. Section components (5.20–5.26) are skeletons — implement the described structure and behaviour; exact styling is flexible as long as Tailwind classes are used and the component is responsive.

### 5.1 Install dependencies

From the repo root:

```bash
# Runtime deps
pnpm --filter @portfolio/web add react-router i18next react-i18next i18next-browser-languagedetector @tanstack/react-query @portfolio/shared@workspace:*

# Tailwind v4
pnpm --filter @portfolio/web add -D tailwindcss @tailwindcss/vite

# Testing
pnpm --filter @portfolio/web add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test
```

> `vitest` is already available from the root workspace — do not add it again to `apps/web`.

### 5.2 `apps/web/.env.example`

```env
VITE_API_URL=http://localhost:3000
```

Copy to `.env` locally (`.env` is gitignored).

**What is `VITE_API_URL`?**

Vite is a frontend build tool (like webpack, but faster). It has a built-in way to pass configuration into your React code at build time via **environment variables**.

- Variables must be prefixed with `VITE_` to be exposed to client-side code. This is a security feature — without the prefix, secrets could accidentally leak into the browser bundle.
- You define them in a `.env` file (or `.env.local`, `.env.production`, etc.).
- In code, you read them via `import.meta.env.VITE_API_URL` (not `process.env` — that's Node.js).

In this project, `VITE_API_URL` is the base URL of the NestJS API (`apps/api`, built in Phase 2). During local development it points at `http://localhost:3000`. In production (Docker on the Pi) it will point at `https://api.yourdomain.com`. The typed API client in `src/lib/apiClient.ts` uses it like this:

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
// fetch(`${BASE_URL}/contact`, ...)
```

The `?? "http://localhost:3000"` fallback means the app still works if `.env` is missing — useful while the API doesn't exist yet.

### 5.3 `apps/web/package.json`

**Do not replace the entire file.** The existing scaffold already has the correct base (`name`, `type`, React, Vite, TypeScript). Running the `pnpm add` commands in section 5.1 automatically updates `dependencies` and `devDependencies` in `package.json` — you do not need to paste a full replacement block.

After installing packages, **manually add the missing scripts** to the existing `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

The final `package.json` should look roughly like this (versions come from the lockfile after `pnpm add`):

```json
{
  "name": "@portfolio/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "@portfolio/shared": "workspace:*",
    "@tanstack/react-query": "...",
    "i18next": "...",
    "i18next-browser-languagedetector": "...",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-i18next": "...",
    "react-router": "..."
  },
  "devDependencies": {
    "@playwright/test": "...",
    "@tailwindcss/vite": "...",
    "@testing-library/jest-dom": "...",
    "@testing-library/react": "...",
    "@testing-library/user-event": "...",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "...",
    "tailwindcss": "...",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

> `"..."` placeholders above mean "whatever version `pnpm add` resolved" — the lockfile is the source of truth, not this spec.

### 5.4 `apps/web/vite.config.ts`

Add the Tailwind v4 plugin and resolve the `@portfolio/shared` workspace alias.

```ts
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
```

### 5.5 `apps/web/tsconfig.json`

Extend the base config with DOM libs and a local `@shared/*` path alias.

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
    "rootDir": "src",
    "paths": {
      "@shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src"]
}
```

### 5.6 `apps/web/src/vite-env.d.ts`

Add Vite client types and the `VITE_API_URL` env var.

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 5.7 `apps/web/src/index.css`

Tailwind v4 CSS-first config. No `tailwind.config.js` or PostCSS config needed.

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-canvas: oklch(0.98 0.01 240);
  --color-surface: oklch(0.95 0.01 240);
  --color-ink: oklch(0.15 0.02 240);
  --color-ink-soft: oklch(0.45 0.02 240);
  --color-accent: oklch(0.55 0.15 250);
  --color-accent-hover: oklch(0.48 0.15 250);
  --font-sans: "Inter", system-ui, sans-serif;
}

.dark {
  --color-canvas: oklch(0.15 0.02 240);
  --color-surface: oklch(0.2 0.02 240);
  --color-ink: oklch(0.92 0.01 240);
  --color-ink-soft: oklch(0.65 0.01 240);
  --color-accent: oklch(0.65 0.15 250);
  --color-accent-hover: oklch(0.72 0.15 250);
}

body {
  @apply bg-canvas text-ink font-sans antialiased;
}
```

### 5.8 `apps/web/index.html`

Add a no-flash dark-mode script **before** any stylesheet loads, and update the title.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Portfolio</title>
    <script>
      (() => {
        const stored = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const shouldBeDark = stored === "dark" || (stored === null && prefersDark);
        document.documentElement.classList.toggle("dark", shouldBeDark);
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 5.9 `apps/web/src/i18n/config.ts`

Configure i18next with browser language detection. Supported locales match `@portfolio/shared`'s `Locale` type.

```ts
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import pt from "./locales/pt.json";
import pl from "./locales/pl.json";

const resources = {
  en: { translation: en },
  pt: { translation: pt },
  pl: { translation: pl },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "pt", "pl"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
```

### 5.10 `apps/web/src/i18n/locales/en.json`

Skeleton locale file. Other locales mirror the same keys.

```json
{
  "nav": {
    "about": "About",
    "skills": "Skills",
    "projects": "Projects",
    "resume": "Resume",
    "contact": "Contact"
  },
  "hero": {
    "greeting": "Hi, I'm",
    "name": "Your Name",
    "tagline": "Full-stack developer building modern web applications.",
    "cta": "Get in touch"
  },
  "about": {
    "title": "About Me",
    "body": "Write a short bio here. Mention your background, interests, and what you're currently working on."
  },
  "skills": {
    "title": "Skills"
  },
  "projects": {
    "title": "Projects",
    "viewRepo": "View repo"
  },
  "resume": {
    "title": "Resume",
    "download": "Download PDF"
  },
  "contact": {
    "title": "Contact",
    "name": "Name",
    "email": "Email",
    "message": "Message",
    "send": "Send message",
    "success": "Message sent!",
    "error": "Failed to send. Please try again."
  },
  "footer": {
    "copyright": "© {{year}} Your Name. All rights reserved."
  },
  "theme": {
    "light": "Light mode",
    "dark": "Dark mode"
  }
}
```

### 5.11 `apps/web/src/i18n/locales/pt.json`

Portuguese translations using the same keys as `en.json`.

```json
{
  "nav": {
    "about": "Sobre",
    "skills": "Competências",
    "projects": "Projetos",
    "resume": "Currículo",
    "contact": "Contacto"
  },
  "hero": {
    "greeting": "Olá, sou",
    "name": "O Seu Nome",
    "tagline": "Desenvolvedor full-stack a criar aplicações web modernas.",
    "cta": "Entrar em contacto"
  },
  "about": {
    "title": "Sobre Mim",
    "body": "Escreva uma breve biografia aqui. Mencione a sua formação, interesses e o que está a fazer atualmente."
  },
  "skills": {
    "title": "Competências"
  },
  "projects": {
    "title": "Projetos",
    "viewRepo": "Ver repositório"
  },
  "resume": {
    "title": "Currículo",
    "download": "Descarregar PDF"
  },
  "contact": {
    "title": "Contacto",
    "name": "Nome",
    "email": "Email",
    "message": "Mensagem",
    "send": "Enviar mensagem",
    "success": "Mensagem enviada!",
    "error": "Falha ao enviar. Tente novamente."
  },
  "footer": {
    "copyright": "© {{year}} O Seu Nome. Todos os direitos reservados."
  },
  "theme": {
    "light": "Modo claro",
    "dark": "Modo escuro"
  }
}
```

### 5.12 `apps/web/src/i18n/locales/pl.json`

Polish translations using the same keys as `en.json`.

```json
{
  "nav": {
    "about": "O mnie",
    "skills": "Umiejętności",
    "projects": "Projekty",
    "resume": "CV",
    "contact": "Kontakt"
  },
  "hero": {
    "greeting": "Cześć, jestem",
    "name": "Twoje Imię",
    "tagline": "Full-stack developer tworzący nowoczesne aplikacje webowe.",
    "cta": "Skontaktuj się"
  },
  "about": {
    "title": "O mnie",
    "body": "Napisz krótkie bio tutaj. Wspomnij o swoim doświadczeniu, zainteresowaniach i tym, nad czym obecnie pracujesz."
  },
  "skills": {
    "title": "Umiejętności"
  },
  "projects": {
    "title": "Projekty",
    "viewRepo": "Zobacz repozytorium"
  },
  "resume": {
    "title": "CV",
    "download": "Pobierz PDF"
  },
  "contact": {
    "title": "Kontakt",
    "name": "Imię",
    "email": "Email",
    "message": "Wiadomość",
    "send": "Wyślij wiadomość",
    "success": "Wiadomość wysłana!",
    "error": "Nie udało się wysłać. Spróbuj ponownie."
  },
  "footer": {
    "copyright": "© {{year}} Twoje Imię. Wszelkie prawa zastrzeżone."
  },
  "theme": {
    "light": "Tryb jasny",
    "dark": "Tryb ciemny"
  }
}
```

### 5.13 `apps/web/src/theme/ThemeProvider.tsx`

React context for toggling dark mode. Syncs with the inline script in `index.html`.

```tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

### 5.14 `apps/web/src/lib/apiClient.ts`

Typed fetch wrapper. Uses `@portfolio/shared` DTOs. Gracefully handles the API not running (Phase 2).

```ts
import type { ContactMessageDto, HealthStatus } from "@shared/index.js";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/health");
}

export async function postContactMessage(dto: ContactMessageDto): Promise<void> {
  await request<void>("/contact", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
```

### 5.15 `apps/web/src/lib/queryClient.ts`

Shared TanStack Query client instance.

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});
```

### 5.16 `apps/web/src/router.tsx`

React Router v7 data router. Single-page layout with scroll-to-section anchors.

```tsx
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout.js";
import { Home } from "./routes/Home.js";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [{ index: true, element: <Home /> }],
  },
]);
```

### 5.17 `apps/web/src/main.tsx`

App entry point. Wires i18n, theme, TanStack Query, and the router.

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

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
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

### 5.18 `apps/web/src/App.tsx`

Remove the "Hello World" placeholder. This file is no longer the entry component — the router drives rendering. Either delete it or re-export from `Home` for backwards compatibility:

```tsx
export { Home as App } from "./routes/Home.js";
```

### 5.19 `apps/web/src/routes/Home.tsx`

Single-page home route that renders all portfolio sections in order.

```tsx
import { About } from "../sections/About.js";
import { Contact } from "../sections/Contact.js";
import { Hero } from "../sections/Hero.js";
import { Projects } from "../sections/Projects.js";
import { Resume } from "../sections/Resume.js";
import { Skills } from "../sections/Skills.js";

export function Home() {
  return (
    <>
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Resume />
      <Contact />
    </>
  );
}
```

### 5.20 `apps/web/src/components/Layout.tsx` (skeleton)

Root layout wrapping all routes. Renders `Navbar`, an `<Outlet />`, and `Footer`.

```tsx
import { Outlet } from "react-router";

import { Footer } from "./Footer.js";
import { Navbar } from "./Navbar.js";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
```

### 5.21 `apps/web/src/components/Navbar.tsx` (skeleton)

Sticky top navbar with:

- Anchor links to each section (`#about`, `#skills`, etc.) using `t("nav.*")` keys.
- Locale switcher (EN / PT / PL) calling `i18n.changeLanguage()`.
- Dark mode toggle button using `useTheme()`.

Use Tailwind for responsive layout (hamburger menu on mobile is optional but recommended).

### 5.22 `apps/web/src/components/Footer.tsx` (skeleton)

Simple footer displaying `t("footer.copyright", { year: new Date().getFullYear() })`.

### 5.23 `apps/web/src/sections/Hero.tsx` (skeleton)

Full-viewport hero section with:

- `t("hero.greeting")`, `t("hero.name")`, `t("hero.tagline")`.
- CTA button linking to `#contact`.
- Subtle background gradient using `@theme` tokens.

### 5.24 `apps/web/src/sections/About.tsx`, `Skills.tsx`, `Projects.tsx`, `Resume.tsx` (skeleton)

Each section:

- Has an `id` matching the navbar anchor (e.g. `id="about"`).
- Uses `t("<section>.title")` and section-specific translation keys.
- **About:** renders `t("about.body")`.
- **Skills:** displays a grid/list of skill tags (hardcoded array of strings for now).
- **Projects:** displays static placeholder project cards (title, description, repo URL). Data shape:

```ts
interface ProjectCard {
  title: string;
  description: string;
  repoUrl: string;
  tags: string[];
}
```

- **Resume:** a download link to `/resume.pdf` with `t("resume.download")`.

### 5.25 `apps/web/src/sections/Contact.tsx` (skeleton)

Contact form that:

- Collects name, email, message.
- Validates required fields and email format client-side.
- On submit, calls `postContactMessage()` from `apiClient.ts` with a `ContactMessageDto`.
- Shows success/error messages using `t("contact.success")` / `t("contact.error")`.
- Uses TanStack Query `useMutation` for the POST call.

### 5.26 `apps/web/src/sections/Hero.test.tsx`

Sample component test proving the Vitest + RTL setup works.

```tsx
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";

import i18n from "../i18n/config.js";
import { Hero } from "./Hero.js";

describe("Hero", () => {
  it("renders the hero greeting", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Hero />
      </I18nextProvider>,
    );
    expect(screen.getByText(/hi, i'm/i)).toBeInTheDocument();
  });
});
```

### 5.27 `apps/web/src/test/setup.ts`

Vitest setup file for jsdom + jest-dom matchers.

```ts
import "@testing-library/jest-dom/vitest";
```

### 5.28 Root `vitest.workspace.ts`

Append the `web` project to the existing workspace array.

```ts
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "shared",
      root: "./packages/shared",
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  },
  {
    test: {
      name: "web",
      root: "./apps/web",
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["./src/test/setup.ts"],
    },
  },
  // Phase 2 appends: apps/api (environment: "node", Supertest/Testcontainers)
]);
```

### 5.29 `apps/web/playwright.config.ts`

Playwright E2E config. Starts the Vite dev server automatically.

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.30 `apps/web/e2e/home.spec.ts`

Smoke test verifying the home page renders key sections.

```ts
import { test, expect } from "@playwright/test";

test("home page renders hero and navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
});

test("dark mode toggle works", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const wasDark = await html.evaluate((el) => el.classList.contains("dark"));
  await page.getByRole("button", { name: /dark mode|light mode/i }).click();
  const isDark = await html.evaluate((el) => el.classList.contains("dark"));
  expect(isDark).toBe(!wasDark);
});
```

### 5.31 `apps/web/public/resume.pdf`

Place any small valid PDF file here as a placeholder. A one-page PDF generated with any tool is fine — the download link just needs a real file to serve.

## 6. Execution order (commands)

Run from the repo root (`/home/joelito/about-me`), in this order:

```bash
# 0. Create feature branch (section 3)
git checkout -b feature/phase-1

# 1. Install dependencies (section 5.1) — this updates package.json automatically
pnpm --filter @portfolio/web add react-router i18next react-i18next i18next-browser-languagedetector @tanstack/react-query @portfolio/shared@workspace:*
pnpm --filter @portfolio/web add -D tailwindcss @tailwindcss/vite @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test

# 2. Add test/E2E scripts to apps/web/package.json (section 5.3)

# 3. Create/update all other files from section 5

# 4. Copy env example
cp apps/web/.env.example apps/web/.env

# 5. Install (regenerates lockfile if needed)
pnpm install

# 6. Verify the toolchain
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @portfolio/web build

# 7. Manual smoke check
pnpm --filter @portfolio/web dev
# Open http://localhost:5173 — verify sections, dark mode, locale switch

# 8. E2E (install browsers first, one-time)
pnpm --filter @portfolio/web exec playwright install chromium
pnpm --filter @portfolio/web test:e2e

# 9. Commit on feature/phase-1
git add .
git commit -m "feat(web): portfolio SPA with Tailwind, i18n, dark mode, tests (phase 1)"
```

## 7. Acceptance criteria

Phase 1 is complete when **all** of the following hold:

- [ ] `pnpm --filter @portfolio/web dev` serves the SPA at `http://localhost:5173` with all six sections visible.
- [ ] Dark mode toggles via navbar button; preference persists across reloads (no flash on load).
- [ ] Locale switcher cycles EN / PT / PL; all visible text updates.
- [ ] Contact form validates required fields; submit calls `POST /contact` (fails gracefully if API is down).
- [ ] Resume section links to `/resume.pdf` and the file downloads.
- [ ] `pnpm typecheck` passes (0 errors) for the whole monorepo.
- [ ] `pnpm lint` passes (0 errors; warnings allowed).
- [ ] `pnpm test` runs both `shared` and `web` Vitest projects; all tests pass.
- [ ] `pnpm --filter @portfolio/web build` produces a `dist/` folder with no errors.
- [ ] `pnpm --filter @portfolio/web test:e2e` passes the Playwright smoke tests.
- [ ] The directory tree matches section 4.
- [ ] Root `vitest.workspace.ts` includes the `web` project with jsdom + RTL setup.

## 8. Testing architecture

Phase 1 adds the **web testing layer** on top of the Phase 0 foundation.

- **Unit / component:** Vitest + jsdom + React Testing Library. Tests co-located as `src/**/*.test.tsx`. Setup file at `src/test/setup.ts` imports `@testing-library/jest-dom/vitest`.
- **E2E:** Playwright under `apps/web/e2e/`. Config starts the Vite dev server automatically. Smoke tests verify rendering, navigation, and dark mode toggle.
- **Coverage:** inherited from root `@vitest/coverage-v8` (`pnpm test:coverage`). Thresholds enforced in CI (Phase 6).
- **Conventions:** co-locate unit tests beside source; E2E in `e2e/`; integration tests for the API added in Phase 2 under `apps/api/test/`.

## 9. Notes & decisions

- **Tailwind v4 CSS-first:** no `tailwind.config.js` or PostCSS. Design tokens live in `@theme` inside `index.css`. The `@tailwindcss/vite` plugin handles everything.
- **Dark mode:** class-based via `@custom-variant dark (&:where(.dark, .dark *))`. A tiny inline script in `index.html` prevents flash-of-wrong-theme before React hydrates.
- **React Router v7 data router:** `createBrowserRouter` + `RouterProvider` (from `react-router/dom`). Single route with scroll-to-section anchors — no multi-page routing needed for a portfolio SPA.
- **i18next:** browser language detector reads `localStorage` first, then `navigator`. Locale preference persists across sessions.
- **API client:** points at `VITE_API_URL` (see section 5.2). Uses `@portfolio/shared` DTOs for type safety. Contact form POST fails gracefully until Phase 2 builds the API.
- **Projects section — static placeholders, not live GitHub data:** Phase 1 renders a hardcoded array of 2–3 fake project cards inside `Projects.tsx` (title, description, repo URL, tags). This lets you build and style the UI without waiting for the API or a GitHub token. Example:

  ```ts
  const PROJECTS: ProjectCard[] = [
    {
      title: "Portfolio Monorepo",
      description: "This site.",
      repoUrl: "https://github.com/you/about-me",
      tags: ["React", "NestJS"],
    },
    {
      title: "Side Project",
      description: "Something else.",
      repoUrl: "https://github.com/you/other",
      tags: ["TypeScript"],
    },
  ];
  ```

  A future enhancement (not Phase 1) could fetch real repos from the GitHub API via TanStack Query — either directly from the browser (needs a public token or proxy) or through a backend endpoint in Phase 2. Keeping it static now avoids scope creep and API rate-limit concerns.

- Exact dependency versions may float within the specified ranges; the lockfile is the source of truth. Bump majors deliberately, not automatically.
