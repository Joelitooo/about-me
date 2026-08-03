# Phase 7 - Frontend identity redesign (`apps/web`)

> Part of the [Portfolio Fullstack Monorepo](../../MAIN_PLAN.md) plan. Frontend only — no API, infra, or CI changes. A live uptime feed for the proof strip was researched and deferred to a later phase; see [`UptimeKumaFeatureAnalisys.md`](UptimeKumaFeatureAnalisys.md).

**Goal:** turn the current generic Phase 1 placeholder SPA into a distinctive, recruiter-facing portfolio: a second "paper" palette selectable alongside the original, a full-bleed navbar, an impactful but simple hero, Skills merged into Work, Resume merged into About, real bio copy, plus Umami CTA tracking, an accessibility pass, and a live-proof stack strip.

**Positioning locked in the interview (2026-08-03):**

| Question                 | Answer                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| Target role              | Full-stack, frontend-leaning (React/TS + design sense)                    |
| Seniority                | Mid-level — 4 years exactly                                               |
| Market                   | Warsaw, Poland (on-site / hybrid), recently relocated                     |
| One-thing differentiator | Thinks about product and users, not just tickets                          |
| Bio voice                | Confident and plain-spoken, short sentences, zero buzzwords               |
| Palette                  | Bone / paper + terracotta, **added alongside** the original slate palette |
| Hero photo               | Yes — supplied                                                            |
| Extra scope accepted     | Umami CTA tracking, accessibility pass, live-proof stack strip            |

## Prerequisites

- Phases 0–6 complete (they are; `MAIN_PLAN.md`'s tracker is stale and still shows everything unchecked).
- `apps/web` is a **Vite 5 + React 19 SPA** with React Router 8 and **Tailwind v4 CSS-first config** — there is no `tailwind.config.js`, so all design tokens live in `apps/web/src/index.css`.
- The API in `apps/api` is **NestJS**; nothing in this phase touches it.
- Work on a feature branch: `feature/phase-7-redesign` (repo convention is `feature/phase-N`).

## 1. Current state audit

What makes the page read as "generic AI output" today, with the evidence:

| Symptom                   | Where                                   | Detail                                                                                                                                              |
| ------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default blue-grey palette | `src/index.css` lines 6–11              | Every token sits at hue 240/250 — the stock "AI blue".                                                                                              |
| No real typeface          | `src/index.css` line 12                 | `--font-sans: "Inter", …` is declared but Inter is **never loaded** (no `@font-face`, no link tag). The whole site actually renders in `system-ui`. |
| Cliché hero               | `src/sections/Hero.tsx`                 | "Hi, I'm" + name + one-line tagline + radial-gradient blob — the exact default template.                                                            |
| Narrow centred everything | 7 files                                 | `mx-auto max-w-5xl px-4` repeated in every section; nothing uses the page width.                                                                    |
| Pill-cloud skills         | `src/sections/Skills.tsx` lines 3–12    | Eight unranked pills; says nothing about depth.                                                                                                     |
| Placeholder copy          | `src/i18n/locales/*.json`               | `"Your Name"`, `"Write a short bio here."`, `"© {{year}} Your Name"`.                                                                               |
| Placeholder projects      | `src/sections/Projects.tsx` lines 10–23 | `github.com/you/about-me`, `"A sample project card used as Phase 1 placeholder content."`                                                           |
| Uniform rhythm            | all sections                            | Every section is `py-20` with an alternating `bg-surface`, so nothing has visual hierarchy.                                                         |

### 1.1 Bugs folded into this phase

Found while auditing. Both are real defects independent of the redesign, and both get fixed here:

- **BUG-1 — `text-white` hardcoded on accent buttons** (`Hero.tsx` line 23, same pattern in `Contact.tsx`). The dark-mode accent is already light (`oklch(0.65 …)`), so white-on-terracotta and white-on-light-blue both fail WCAG AA today. Fix: introduce a `--color-on-accent` token per palette per mode and replace every `text-white`. This is why the new palette can't just be dropped in without it.
- **BUG-2 — `<html lang>` never updates.** It is hardcoded in `index.html`; switching locale to PT or PL leaves `lang="en"`, which misinforms screen readers and search engines. Fix: sync `document.documentElement.lang` with `i18n.resolvedLanguage` on language change.

### 1.2 Asset status

- **Portrait** is at `apps/web/assets/CV_image.jpeg` — a path Vite does not serve. It is neither `public/` (copied verbatim) nor `src/assets/` (imported and hashed), so it would 404. It's also a **1.5 MB JPEG**, which would be the single heaviest thing on the page. See §3.2 for the move, crop, and compression plan.
- **`public/resume.pdf` is now a real CV** (82 KB, replacing the 580-byte Phase 1 placeholder). Resolved. Two follow-ups: make sure the file is actually tracked in git — the `public/` folder currently reads as untracked, so the real PDF could silently not ship — and keep the "last updated" date in the About rail (§3.3) in step with it.

## 2. Design system

### 2.1 Two palettes, switchable

Both palettes ship. `paper` is the new editorial identity and the default; `slate` is the original Phase 1 blue-grey, preserved and selectable. Each palette has a light and a dark mode, so there are **four** token sets.

| Palette           | Character                                                                          |
| ----------------- | ---------------------------------------------------------------------------------- |
| `paper` (default) | Bone paper + terracotta, warm hues 42–85, warm charcoal dark mode. Print-inspired. |
| `slate`           | The current blue-grey, hues 240–250. Cool and conventional.                        |

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

/* Default tokens = paper light. @theme is what generates the Tailwind
   utilities (bg-canvas, text-ink, …) and is the fallback if JS never runs. */
@theme {
  --color-canvas: oklch(0.975 0.008 85);
  --color-surface: oklch(0.945 0.014 80);
  --color-ink: oklch(0.23 0.018 55);
  --color-ink-soft: oklch(0.47 0.02 55);
  --color-accent: oklch(0.52 0.13 42);
  --color-accent-hover: oklch(0.45 0.13 42);
  --color-on-accent: oklch(0.99 0.005 85);
  --color-line: oklch(0.23 0.018 55 / 0.12);
}

:root[data-palette="paper"] {
  /* same eight values as @theme above */
}

:root[data-palette="paper"].dark {
  --color-canvas: oklch(0.165 0.012 55); /* warm charcoal, not blue-black */
  --color-surface: oklch(0.215 0.016 55);
  --color-ink: oklch(0.94 0.01 85);
  --color-ink-soft: oklch(0.7 0.014 80);
  --color-accent: oklch(0.7 0.12 45); /* lifted so it reads on dark */
  --color-accent-hover: oklch(0.78 0.11 48);
  --color-on-accent: oklch(0.18 0.02 55); /* dark text on light terracotta */
  --color-line: oklch(0.94 0.01 85 / 0.14);
}

:root[data-palette="slate"] {
  --color-canvas: oklch(0.98 0.01 240);
  --color-surface: oklch(0.95 0.01 240);
  --color-ink: oklch(0.15 0.02 240);
  --color-ink-soft: oklch(0.45 0.02 240);
  --color-accent: oklch(0.55 0.15 250);
  --color-accent-hover: oklch(0.48 0.15 250);
  --color-on-accent: oklch(0.99 0.005 240); /* new - was hardcoded white */
  --color-line: oklch(0.15 0.02 240 / 0.12); /* new - was border-ink/10 */
}

:root[data-palette="slate"].dark {
  --color-canvas: oklch(0.15 0.02 240);
  --color-surface: oklch(0.2 0.02 240);
  --color-ink: oklch(0.92 0.01 240);
  --color-ink-soft: oklch(0.65 0.01 240);
  --color-accent: oklch(0.65 0.15 250);
  --color-accent-hover: oklch(0.72 0.15 250);
  --color-on-accent: oklch(0.15 0.02 240); /* dark text - fixes BUG-1 */
  --color-line: oklch(0.92 0.01 240 / 0.14);
}
```

**Two implementation details that will bite if missed:**

1. **Specificity.** Write each palette as an explicit attribute selector and let `.dark` add specificity _within_ a palette (`:root[data-palette="x"]` is 0-2-0, `:root[data-palette="x"].dark` is 0-3-0). Because the two attribute selectors are mutually exclusive, the blocks are order-independent — no fragile source-order dependency. Do **not** keep a bare `.dark { … }` block, or it will lose to whichever palette rule matches. Keep `@custom-variant dark` as-is, since `dark:` utilities still key off the class.
2. **The existing `.dark` block in `index.css` lines 15–22 gets replaced**, not extended. Its values move verbatim into `:root[data-palette="slate"].dark`.

**Contrast must be verified across all four combinations**, not assumed: `ink`/`canvas`, `ink-soft`/`canvas`, `ink-soft`/`surface`, `on-accent`/`accent`, and `accent`/`canvas` for link text. Target WCAG AA (4.5:1 body, 3:1 large text and UI borders). Adjust lightness only — keep hue and chroma so each identity holds.

### 2.2 Palette switching mechanism

Two independent axes on `<html>`: `.dark` for the light/dark mode (unchanged) and `data-palette` for the palette (new).

- **`ThemeProvider`** (`src/theme/ThemeProvider.tsx`) gains `palette` state and `togglePalette`, persisted under a new `localStorage` key `palette`, mirroring how `theme` already works. Exported type `Palette = "paper" | "slate"`.
- **The no-flash inline script** in `index.html` lines 7–13 must now set **both** `.dark` and `data-palette` before React mounts, otherwise the page flashes paper-then-slate for anyone who chose slate.
- **Default when nothing is stored:** `paper`. Flipping the default to `slate` is a one-line change in `getInitialPalette`.
- A **palette toggle button** goes in the navbar next to the theme toggle (§3.1).

Worth flagging: this puts four controls in the navbar — locale, theme, palette, CV. That is a lot of chrome for a portfolio, and chrome competes with content. The plan groups locale/theme/palette into one compact icon cluster, visually subordinate to the CV button, and they collapse into the mobile menu. If it still feels busy when built, the palette switch is the first candidate to move into the footer.

### 2.3 Typography — the highest-impact change

Loading a real, opinionated typeface will do more work than the palette, because right now the site has no typeface at all.

| Role      | Face                    | Use                                                                                                             |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Display   | **Fraunces** (variable) | Hero name, section headings — a soft-serif with optical size and "wonk" axes; distinctive and free.             |
| Body / UI | **Inter** (variable)    | Paragraphs, nav, form controls. Already the intended body font, just actually load it.                          |
| Mono      | **JetBrains Mono**      | Section index labels, tech tags, the live-proof strip. Adds engineer texture and reinforces the editorial grid. |

Self-host via `@fontsource-variable/*` rather than Google Fonts: same-origin, so the CSP in `infra/nginx.conf` needs **no change**, and it removes a third-party render-blocking request. Add `--font-display` and `--font-mono` alongside `--font-sans`. Subset to latin + latin-ext — Portuguese and Polish diacritics are required (`ã ç õ á â`, `ą ć ę ł ń ó ś ź ż`). Both palettes share the typography; only colour changes between them.

### 2.4 Layout — the 24px editorial frame

Requisite 1 (full-width navbar with 24px gutters) becomes the layout rule for the whole page, otherwise a full-bleed navbar above `max-w-5xl` content looks disconnected.

- **Global gutter: 24px** (`px-6`) at every breakpoint, widening to `px-10` at `lg` and `px-16` at `2xl`. Navbar, sections, and footer share it, so every left edge lands on the same vertical rule.
- Use `px-6` on the nav element rather than `mx-6`: visually identical, but it lets the header's bottom hairline span the true full width, which is what makes the frame read as deliberate.
- Sections go full-bleed; **text measure** is constrained separately with `max-w-[68ch]` on prose. Wide layout, comfortable reading line — the thing generic templates get wrong.
- **Asymmetric section header:** a narrow left rail with a mono index label (`01 / ABOUT`), heading and content in the right column, collapsing above the content on mobile. This single pattern carries most of the "designed, not generated" feeling.
- **Vertical rhythm stops being uniform:** hero `min-h-[calc(100svh-4rem)]` (`svh`, not `vh`, so mobile browser chrome doesn't cause a scroll jump), major sections `py-28 lg:py-36`, live-proof strip deliberately tight at `py-10`.
- Replace alternating `bg-surface` bands with hairline `border-line` rules between sections. Cards keep `bg-surface`.

### 2.5 Identity constants

New `src/lib/site.ts` — one source of truth for identity, replacing the hardcoded `"Joel Silva"` in `Hero.tsx` line 19, `"Portfolio"` in `Navbar.tsx` line 21, and `"Your Name"` in the locale files:

```ts
export const SITE = {
  name: "Joel Silva",
  role: "Frontend Software Engineer",
  company: "eDreams",
  location: "Warsaw, Poland",
  yearsExperience: 4,
  email: "joelitocontas@gmail.com",
  links: {
    github: "https://github.com/Joelitooo",
    linkedin: "https://www.linkedin.com/in/joel-filipe-silva/",
    repo: "https://github.com/Joelitooo/about-me",
  },
} as const;
```

Consumed by Navbar, Hero, About, LiveProof, Contact, and Footer. A name is not translatable copy, so the unused `hero.name` key is deleted from all three locale files and `footer.copyright` becomes `"© {{year}} {{name}}. …"` with the name interpolated from `SITE`.

### 2.6 Motion

Deliberately minimal — scroll-reveal was considered and parked. Only micro-interactions: 150ms colour and border transitions on hover and focus, and the hero photo frame settling on load. All wrapped in `@media (prefers-reduced-motion: reduce)` guards.

## 3. Section-by-section plan

Final homepage order in `src/routes/Home.tsx`:

```
Hero  →  About + CV  →  Work (skills + projects)  →  Live proof strip  →  Contact
```

This keeps the order you listed. Putting Work before About is a one-line swap if you want proof before narrative — worth an honest look, since recruiters skim for evidence first.

### 3.1 Navbar — requisite 1

`src/components/Navbar.tsx`. Replace `mx-auto flex max-w-5xl … px-4` with `flex w-full … px-6 lg:px-10`.

- Brand on the left: `SITE.name` in the display face, not the literal string `"Portfolio"`.
- Nav links centred; the set shrinks to **About · Work · Contact** because of the two merges.
- Right cluster: the compact locale / theme / palette group, then a **"CV" button** — a recruiter should be able to grab the PDF without scrolling.
- Hairline bottom rule using `border-line`; keep `sticky top-0 backdrop-blur`.
- Mobile: keep the existing disclosure, add Escape-to-close, `aria-current` on the active section, and a real icon instead of the text `"Menu"`.

**Constraint:** the theme toggle's accessible name must keep matching `/dark mode|light mode/i` or `e2e/home.spec.ts` line 13 breaks. If it becomes icon-only, preserve the name via `aria-label`. Give the new palette button a clearly _different_ accessible name (e.g. "Paper theme" / "Slate theme") so the existing selector stays unambiguous.

### 3.2 Hero — requisite 6

`src/sections/Hero.tsx`. Impactful through scale and restraint, not effects.

- **Kill the radial gradient** (line 13) — that blob is the most recognisable AI-template artifact. Optionally replace with a very low-opacity SVG paper grain, which suits the print direction.
- **Drop "Hi, I'm."** Replace the eyebrow with a status line that answers the recruiter's real question: `Frontend engineer · Warsaw · open to hybrid or on-site` with a small live dot.
- **Name at display scale**: `text-6xl sm:text-8xl` in Fraunces, tight tracking and leading. It should feel printed.
- One-line value proposition below in `text-ink-soft`, ~15 words, product-framed.
- Two CTAs: primary "See my work" (filled accent, `text-on-accent`), secondary "Download CV" (outline).
- **Photo**, right column: two columns at `lg`, stacked with a smaller photo on mobile.

**Photo preparation** (blocking, from §1.2):

1. Move `apps/web/assets/CV_image.jpeg` → `src/assets/portrait.jpg` and `import` it, so Vite hashes it and the long-lived asset caching in `infra/nginx.conf` applies. The current `apps/web/assets/` path is not served at all. The `CV_image` name is also misleading — it is a portrait, not a CV.
2. **Crop tighter** to head and shoulders. The current 3:4 frame includes a lot of river and skyline that competes with the type at hero scale.
3. **Compress and convert**: emit WebP (with a JPEG fallback) at 1x/2x widths via `<picture>`, target **under 150 KB total**. 1.5 MB on a first paint is unacceptable, especially for recruiters on mobile.
4. Treatment: thin `border-line` paper frame with an offset solid accent block behind it, and a slight warm grade so the photo sits inside the palette instead of fighting it. The grade must be tuned per palette — a terracotta-warmed portrait will look odd against slate blue, so keep it subtle enough to work for both.

**Constraint:** `src/sections/Hero.test.tsx` line 19 asserts `/hi, i'm/i`. Removing the greeting breaks it — update to assert on `SITE.name` and the new status line.

### 3.3 About + CV — requisite 4

Merge `Resume.tsx` into `About.tsx`; delete `Resume.tsx`. Section `id="about"`, label `01 / ABOUT`.

- **Left:** the bio (§6.1), 2–3 short paragraphs, `max-w-[68ch]`, first paragraph one step larger as a lede.
- **Right rail:** compact mono fact list — role and company, location and work preference, 4 years of experience, CS degree, languages, availability — then the CV download button and a "last updated" date.
- **Languages: Português (native) · English (C1).** No Polish claim. The site's three locales are a _product_ decision, not a language claim, and the rail must not imply otherwise.
- **Experience list**, so the section stands alone without opening the PDF. Structured data as a typed const co-located with the section, matching the existing `PROJECTS` pattern:

| Role                       | Company | Period              |
| -------------------------- | ------- | ------------------- |
| Frontend Software Engineer | eDreams | Sep 2022 – present  |
| Frontend Intern (6 months) | Swogo   | Jan 2022 – Jun 2022 |

Presenting the internship explicitly as an internship is the right call: it explains the timeline without padding the 4-year figure, and recruiters check that arithmetic.

- `public/resume.pdf` (real, 82 KB) stays the source of truth for detail.

### 3.4 Work — requisite 3

Merge `Skills.tsx` into `Projects.tsx`, renamed `Work.tsx`; delete `Skills.tsx`. Section `id="work"`, label `02 / WORK`.

- **Capabilities first, grouped, not a pill cloud.** Three labelled clusters — `Frontend`, `Backend`, `Ops & tooling` — each a mono line of comma-separated technologies, React leading the frontend line. Grouping signals judgement; an undifferentiated pill soup signals a keyword dump. Reflect "React first, adaptable to the rest" in the ordering and in a short closing line rather than by inflating the list.
- **Projects below**, as full-width rows rather than a 2-up grid: title, one-line outcome, tech tags, repo and live links. The layout takes N rows with no change, so adding projects later is a data edit, not a redesign.
- Keep the `viewRepo` i18n key; add `viewLive`.

**Launching with one project.** For now the only entry is `github.com/Joelitooo/about-me` — this site. Two consequences to handle:

1. A single full-width case-study row is the honest presentation; the 2-up card grid would make one project look like a gap.
2. **It overlaps the live-proof strip**, whose content is also this site's stack. To avoid saying the same thing twice, the strip carries the _facts_ (stack, ops, CI) and the project row carries the _story_ (what it is, why those choices, what you'd change). That reads as a case study rather than a repeat.

Since more projects are coming, the row order should put the newest or strongest first rather than appending chronologically.

### 3.5 Live proof strip — accepted

New `src/sections/LiveProof.tsx`, between Work and Contact. Tight `py-10` band, mono type, hairline rules top and bottom.

One line of real, verifiable facts about the site the recruiter is currently looking at:

> This site: React 19 · Vite · Tailwind v4 · NestJS · PostgreSQL · Docker Compose on a Raspberry Pi · Cloudflare Tunnel · GitHub Actions CI/CD with Playwright E2E

Plus a link to `SITE.links.repo`. For a mid-level frontend candidate, "I built and operate the thing you're reading" is stronger than any bullet list — and unlike most portfolio claims, it is checkable. Keep it to one scannable line; it stops working the moment it turns into a wall of logos.

**Static values in this phase.** Feeding a real uptime percentage into this strip from the self-hosted Uptime Kuma instance was researched in full and deferred — it needs an API endpoint, a shared DTO, infra env vars, and a manual Kuma setup step on the Pi, which is more than a frontend phase should carry. The strip is designed so the figure can be appended later without reworking it. See [`UptimeKumaFeatureAnalisys.md`](UptimeKumaFeatureAnalisys.md).

### 3.6 Contact — requisite 5

`src/sections/Contact.tsx`. **Logic untouched** — same `useMutation`, same `postContactMessage`, same manual validation, no new validation library. Visual adaptation only, plus layout:

- Two columns: left a short direct invitation with `SITE.email` as a `mailto:` link plus GitHub and LinkedIn; right the existing form restyled. Having a real address matters — a chunk of recruiters won't fill in a form. Publishing it plainly does invite scrapers, which is the normal trade-off; the form stays as the primary path and the address as the escape hatch.
- Inputs get `bg-surface`, `border-line`, and a visible `focus-visible` ring in the accent colour.
- Success and error states restyled to derive from the palette rather than a stock Tailwind red — and since there are now two palettes, the error colour needs a token per palette too.

### 3.7 Footer

Full-bleed `px-6`, name interpolated from `SITE` (fixes `"Your Name"`), links to GitHub, LinkedIn, and email, and a "built with" line tying back to the live-proof strip.

## 4. Accepted extra scope

### 4.1 Umami CTA tracking

Add `trackEvent(name, data?)` in `src/lib/analytics.ts`: a thin wrapper over `window.umami?.track` that **no-ops when the script is absent**, so local dev and tests stay silent. `UmamiAnalytics.tsx` already loads the script conditionally; the `TrackingEvent` type in `@portfolio/shared` can type the payload.

Events: `cv_download` (with `source: "nav" | "about" | "hero"`), `contact_submit_success`, `project_link_click` (with project slug), `hero_cta_click`. Optionally `palette_change`, which would actually answer whether the switcher earns its place in the navbar. No CSP change — same origin as the existing analytics setup.

### 4.2 Accessibility pass

- Real skip link to `#main`, visible on focus.
- `focus-visible` rings on every interactive element, accent-coloured, 2px offset — there are none today.
- **BUG-2:** sync `<html lang>` with `i18n.resolvedLanguage`.
- **BUG-1:** replace every `text-white` on accent surfaces with `text-on-accent`.
- `aria-current="true"` on the active nav link.
- Escape closes the mobile menu; verify focus order through the new navbar cluster.
- Contrast verification across all four palette/mode combinations (§2.1).
- `prefers-reduced-motion` guards on all transitions.
- Form inputs already have labels — confirm error messages are wired via `aria-describedby` and announced.
- Portrait needs a meaningful `alt` (`"Joel Silva"`), not `"portrait"` or empty.

## 5. Parked suggestions

Considered, deliberately out of scope:

| Suggestion                             | Why it's worth revisiting                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live uptime from Uptime Kuma**       | Fully researched in [`UptimeKumaFeatureAnalisys.md`](UptimeKumaFeatureAnalisys.md) — roughly half a day, and it turns the proof strip's claim into measured evidence. |
| SEO + Open Graph + JSON-LD `Person`    | Shared links currently render with no card, and recruiters do paste links into Slack. `SITE` in §2.5 is already the data source it would need.                        |
| Structured HTML resume + generated PDF | Kills PDF/site drift as the CV gets updated.                                                                                                                          |
| Typed content layer                    | Copy edits without touching components. Deferred to keep this diff reviewable.                                                                                        |
| Scroll-reveal motion                   | Skipped on purpose to protect the restrained feel.                                                                                                                    |
| Full case studies                      | Worth doing once there are two or three real projects — see §3.4.                                                                                                     |

## 6. Content

### 6.1 Bio (EN) — approved

> I'm a frontend engineer with four years of experience, currently at eDreams, working on the tools travellers reach for when something has gone wrong with a booking.
>
> The work I'm most pleased with there is intent recognition in the support search bar: reading what someone actually means and sending them straight to the right support option, instead of handing them a list of guesses to sift through. Fewer dead ends, fewer people giving up. That's the kind of problem I like — narrow in scope, obvious in value the moment you use it.
>
> I studied Computer Science, work mostly in React and TypeScript, and I'm comfortable picking up whatever a project actually needs. This site is a case in point: I built and operate the whole thing, front to back. I recently moved to Warsaw and I'm open to frontend roles here, hybrid or on-site.

Goes into `en.json` split as `about.lede` / `about.p2` / `about.p3` so the lede can be styled separately.

**On "open to roles":** staying for now, as agreed. Keep it in its own i18n key (`hero.status`) rather than baked into a sentence, so it can be pulled or reworded in one edit if your situation changes. Cheap insurance.

### 6.2 Translation plan — requisite 12

- **PT:** translated, then reviewed by you — native speaker, so verification is free and reliable.
- **PL:** translated, then **reviewed by your Polish-speaking friend** before it ships. This resolves the earlier concern: machine-translated Polish on a page aimed at Warsaw employers was the one real risk, and a native pass removes it. Give them `pl.json` alongside the English source so they can see intent, and ask them to check tone as well as grammar — the bio is deliberately plain-spoken, and translation tends to formalise it.
- Locale keys must stay in sync across all three files; missing keys fall back silently and are easy to miss.

### 6.3 Still needed from you

1. **More projects** when you have them — data edit, no redesign (§3.4).
2. **PL review** from your friend before ship (§6.2).
3. **Confirm `public/resume.pdf` is tracked in git** (§1.2), or the real CV won't ship.

## 7. Deliverables

```
apps/web/
  src/
    assets/
      portrait.jpg             # moved from apps/web/assets/CV_image.jpeg, cropped, compressed
    components/
      Navbar.tsx               # full-bleed 24px gutter, CV button, palette switch, a11y
      Footer.tsx               # SITE name, links, email
      Layout.tsx               # skip link, #main landmark, html lang sync (BUG-2)
      SectionHeader.tsx        # new - mono index label + heading rail
    sections/
      Hero.tsx                 # photo, status line, display type, no gradient
      About.tsx                # merged with Resume (bio + CV + facts + experience)
      Work.tsx                 # new - merged Skills + Projects
      LiveProof.tsx            # new - static stack strip
      Contact.tsx              # restyled only, logic untouched
      Hero.test.tsx            # updated assertions
      Skills.tsx               # DELETED
      Projects.tsx             # DELETED (becomes Work.tsx)
      Resume.tsx               # DELETED (merged into About.tsx)
    lib/
      site.ts                  # new - SITE identity constants
      analytics.ts             # new - Umami trackEvent wrapper
    theme/
      ThemeProvider.tsx        # + palette state, data-palette, localStorage
    routes/Home.tsx            # new section order
    index.css                  # 4 token sets, fonts, focus and motion rules
    i18n/locales/{en,pt,pl}.json  # real copy, hero.name removed, footer name interpolated
  index.html                   # no-flash script sets .dark AND data-palette; font preload
  e2e/home.spec.ts             # updated for new nav and sections
  package.json                 # @fontsource-variable deps
phases/phase-7/plan.md         # this file
phases/phase-7/UptimeKumaFeatureAnalisys.md  # deferred feature research
MAIN_PLAN.md                   # Phase 7 row; refresh the stale tracker
```

## 8. Execution order

1. Branch `feature/phase-7-redesign`.
2. Fonts and tokens: add `@fontsource-variable` deps, restructure `index.css` into four token sets, extend `ThemeProvider` and the no-flash script, add the palette switch. Verify contrast in all four combinations. **Commit here** — the site changes character with no structural churn, which makes the rest easy to review.
3. `src/lib/site.ts`; replace hardcoded name and brand strings.
4. Fix BUG-1 and BUG-2.
5. Layout primitives: 24px gutter, `SectionHeader`, skip link.
6. Navbar full-bleed with CV button and control cluster.
7. Portrait: move, crop, compress, `<picture>` element.
8. Hero.
9. Merge About + Resume (with the experience list); delete `Resume.tsx`.
10. Merge Skills + Projects into `Work.tsx`; delete both.
11. Live-proof strip with static facts.
12. Contact and Footer restyle.
13. `analytics.ts` and wire the events.
14. Accessibility sweep and contrast fixes.
15. Copy: bio and real projects into `en.json`, then `pt.json` and `pl.json`.
16. Fix tests: `Hero.test.tsx`, `e2e/home.spec.ts`, and check `e2e/production.spec.ts` for stale selectors.
17. `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @portfolio/web build && pnpm test:e2e`.
18. Update `MAIN_PLAN.md`; open the PR.

## 9. Done when

The homepage is Hero → About+CV → Work → Live proof → Contact; the navbar spans full width with 24px gutters; both palettes work in light and dark mode with a working switcher, persistence, no flash on load, and all four combinations at AA; Fraunces, Inter, and JetBrains Mono are self-hosted and actually loading; the portrait is served, cropped, and under 150 KB; the bio, experience, and projects contain real content in EN, PT (self-reviewed), and PL (natively reviewed); the contact form's behaviour is unchanged; CV downloads and CTA clicks fire Umami events; keyboard navigation works end to end with visible focus; and `pnpm lint`, `typecheck`, `test`, `build`, and `test:e2e` all pass.

## 10. Task checklist

- [ ] Branch created
- [ ] `@fontsource-variable` Fraunces + Inter + JetBrains Mono self-hosted, latin-ext subset
- [ ] `index.css` restructured into paper light/dark + slate light/dark, no bare `.dark` block left
- [ ] `ThemeProvider` palette state + `data-palette` + `localStorage`; no-flash script sets both axes
- [ ] Palette switch button in navbar with its own distinct accessible name
- [ ] Contrast verified AA across all four palette/mode combinations
- [ ] **BUG-1:** `--color-on-accent` in all four sets; every `text-white` on accent removed
- [ ] **BUG-2:** `<html lang>` follows `i18n.resolvedLanguage`
- [ ] `src/lib/site.ts` created; hardcoded name, `"Portfolio"`, and `"Your Name"` all gone; `hero.name` key deleted
- [ ] 24px global gutter; navbar full-bleed; `SectionHeader` rail
- [ ] Navbar reduced to About/Work/Contact plus CV button; theme toggle keeps its accessible name
- [ ] Portrait moved to `src/assets`, cropped, WebP + fallback, under 150 KB, meaningful `alt`
- [ ] Hero: photo, status line in its own i18n key, display-scale name, gradient removed
- [ ] About + Resume merged; facts rail with PT/EN only; experience list incl. Swogo internship; `Resume.tsx` deleted
- [ ] Skills + Projects merged into `Work.tsx`; grouped capabilities; project rows
- [ ] Live-proof strip with static facts, de-duplicated against the project row
- [ ] Contact restyled, logic untouched; `mailto:` from `SITE.email`; per-palette error colour
- [ ] Footer name, links, and email
- [ ] `analytics.ts` no-op-safe; events wired
- [ ] Skip link, focus-visible rings, `aria-current`, Escape-to-close, reduced-motion
- [ ] `public/resume.pdf` tracked in git and linked from hero, About, and navbar
- [ ] Bio and real projects in `en.json`; PT reviewed by you; PL reviewed by native speaker
- [ ] `Hero.test.tsx` and E2E specs updated and passing
- [ ] Full verification suite green; `MAIN_PLAN.md` updated; PR opened
