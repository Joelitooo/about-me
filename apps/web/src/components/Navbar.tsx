import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useTheme } from "../theme/ThemeProvider.js";

const LOCALES = ["en", "pt", "pl"] as const;
const NAV_LINKS = ["about", "skills", "projects", "resume", "contact"] as const;

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-canvas/90 backdrop-blur">
      <nav
        className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3"
        aria-label="Main"
      >
        <a href="#top" className="text-lg font-semibold tracking-tight text-ink">
          Portfolio
        </a>

        <button
          type="button"
          className="rounded-md px-3 py-2 text-sm text-ink md:hidden"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>

        <div
          id="primary-nav"
          className={`${menuOpen ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col gap-3 border-b border-ink/10 bg-canvas px-4 py-4 md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0`}
        >
          <ul className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            {NAV_LINKS.map((key) => (
              <li key={key}>
                <a
                  href={`#${key}`}
                  className="text-sm text-ink-soft transition hover:text-ink"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(`nav.${key}`)}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 md:ml-2">
            <label className="sr-only" htmlFor="locale-select">
              Language
            </label>
            <select
              id="locale-select"
              className="rounded-md border border-ink/15 bg-surface px-2 py-1 text-sm text-ink"
              value={i18n.resolvedLanguage ?? "en"}
              onChange={(event) => {
                void i18n.changeLanguage(event.target.value);
              }}
            >
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {locale.toUpperCase()}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="rounded-md border border-ink/15 bg-surface px-3 py-1 text-sm text-ink transition hover:border-accent"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("theme.light") : t("theme.dark")}
            >
              {theme === "dark" ? t("theme.light") : t("theme.dark")}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
