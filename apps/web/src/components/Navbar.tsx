import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackEvent } from "../lib/analytics.js";
import { SITE } from "../lib/site.js";
import { useTheme } from "../theme/ThemeProvider.js";

const LOCALES = ["en", "pt", "pl"] as const;
const NAV_LINKS = ["about", "work"] as const;

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      ) : (
        <>
          <path d="M4 7h16" strokeLinecap="round" />
          <path d="M4 12h16" strokeLinecap="round" />
          <path d="M4 17h16" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme, palette, togglePalette } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const sections = NAV_LINKS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const controlCluster = (
    <div className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor="locale-select">
        Language
      </label>
      <select
        id="locale-select"
        className="rounded-md border border-line bg-surface px-2 py-1.5 font-mono text-xs uppercase text-ink transition-[border-color,color] duration-150 hover:border-accent"
        value={i18n.resolvedLanguage ?? "en"}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value);
        }}
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {locale}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink transition-[border-color,color] duration-150 hover:border-accent"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? t("theme.light") : t("theme.dark")}
      >
        {theme === "dark" ? t("theme.light") : t("theme.dark")}
      </button>

      <button
        type="button"
        className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink transition-[border-color,color] duration-150 hover:border-accent"
        onClick={togglePalette}
        aria-label={palette === "paper" ? t("palette.slate") : t("palette.paper")}
      >
        {palette === "paper" ? t("palette.slate") : t("palette.paper")}
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur">
      <nav
        className="flex w-full items-center justify-between gap-4 px-6 py-3 md:grid md:grid-cols-[1fr_auto_1fr] lg:px-10 2xl:px-16"
        aria-label="Main"
      >
        <a
          href="#top"
          className="font-display text-lg font-semibold tracking-tight text-ink transition-colors duration-150 hover:text-accent md:justify-self-start"
        >
          {SITE.name}
        </a>

        <button
          type="button"
          className="rounded-md p-2 text-ink md:hidden"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          aria-label={menuOpen ? t("nav.closeMenu") : t("nav.menu")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon open={menuOpen} />
        </button>

        <div
          id="primary-nav"
          className={`${menuOpen ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col gap-4 border-b border-line bg-canvas px-6 py-4 md:contents`}
        >
          <ul className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            {NAV_LINKS.map((key) => (
              <li key={key}>
                <a
                  href={`#${key}`}
                  className="text-sm text-ink-soft transition-colors duration-150 hover:text-ink"
                  aria-current={activeSection === key ? "true" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(`nav.${key}`)}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:gap-3 md:justify-self-end">
            {controlCluster}
            <a
              href="/resume.pdf"
              download
              className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-[background-color,color] duration-150 hover:bg-accent-hover"
              onClick={() => {
                trackEvent("cv_download", { source: "nav" });
                setMenuOpen(false);
              }}
            >
              {t("nav.cv")}
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
