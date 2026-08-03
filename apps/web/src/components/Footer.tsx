import { useTranslation } from "react-i18next";

import { SITE } from "../lib/site.js";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-line">
      <div className="flex flex-col gap-4 px-6 py-8 text-sm text-ink-soft lg:flex-row lg:items-center lg:justify-between lg:px-10 2xl:px-16">
        <p>{t("footer.copyright", { year: new Date().getFullYear(), name: SITE.name })}</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={SITE.links.github}
            target="_blank"
            rel="noreferrer"
            className="transition-colors duration-150 hover:text-ink"
          >
            GitHub
          </a>
          <a
            href={SITE.links.linkedin}
            target="_blank"
            rel="noreferrer"
            className="transition-colors duration-150 hover:text-ink"
          >
            LinkedIn
          </a>
          <a
            href={`mailto:${SITE.email}`}
            className="transition-colors duration-150 hover:text-ink"
          >
            {SITE.email}
          </a>
        </nav>
        <p className="font-mono text-xs">{t("footer.builtWith")}</p>
      </div>
    </footer>
  );
}
