import { useTranslation } from "react-i18next";

import { SITE } from "../lib/site.js";

export function LiveProof() {
  const { t } = useTranslation();

  return (
    <section
      id="live-proof"
      aria-label={t("liveProof.label")}
      className="border-y border-line px-6 py-10 lg:px-10 2xl:px-16"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between lg:gap-8">
        <p className="font-mono text-sm leading-relaxed text-ink-soft">
          <span className="text-ink">{t("liveProof.label")}:</span> {t("liveProof.stack")}
        </p>
        <a
          href={SITE.links.repo}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 font-mono text-sm text-accent transition-colors duration-150 hover:text-accent-hover"
        >
          {t("liveProof.repo")}
        </a>
      </div>
    </section>
  );
}
