import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { FoundMeModal } from "../components/FoundMeModal.js";
import { TechBackdrop } from "../components/TechBackdrop.js";
import { trackEvent } from "../lib/analytics.js";
import { SITE } from "../lib/site.js";

export function Hero() {
  const { t } = useTranslation();
  const [foundMeOpen, setFoundMeOpen] = useState(false);
  const closeFoundMe = useCallback(() => setFoundMeOpen(false), []);

  return (
    <section
      id="top"
      className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden px-6 py-16 lg:px-10 lg:py-20 2xl:px-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply dark:opacity-[0.06] dark:mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <TechBackdrop onReactClick={() => setFoundMeOpen(true)} />

      {/* Transparent to the pointer so the logos it covers still answer hover;
          the buttons opt back in below. */}
      <div className="hero-intro pointer-events-none relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        {/* The three lines are separate blocks, so spell the name out for AT
            instead of relying on engines to infer the gaps between them. */}
        <h1 className="mb-10" aria-label={`${t("hero.greeting")} ${SITE.name}, ${t("hero.role")}`}>
          <span className="block font-sans text-xl font-normal text-ink-soft sm:text-2xl">
            {t("hero.greeting")}
          </span>
          <span className="mt-1 block font-display text-6xl font-semibold leading-[0.95] tracking-tight text-ink sm:text-8xl">
            {SITE.name}
          </span>
          <span className="mt-4 block font-mono text-sm uppercase tracking-[0.18em] text-accent sm:text-base">
            {t("hero.role")}
          </span>
        </h1>

        <div className="pointer-events-auto flex flex-wrap justify-center gap-3">
          <a
            href="#work"
            className="inline-flex rounded-md bg-accent px-5 py-3 text-sm font-semibold text-on-accent transition-[background-color,color] duration-150 hover:bg-accent-hover"
            onClick={() => trackEvent("hero_cta_click", { target: "work" })}
          >
            {t("hero.ctaWork")}
          </a>
          <a
            href="/resume.pdf"
            download
            className="inline-flex rounded-md border border-line bg-canvas/70 px-5 py-3 text-sm font-semibold text-ink transition-[border-color,color] duration-150 hover:border-accent"
            onClick={() => {
              trackEvent("cv_download", { source: "hero" });
              trackEvent("hero_cta_click", { target: "cv" });
            }}
          >
            {t("hero.ctaCv")}
          </a>
        </div>
      </div>

      <FoundMeModal open={foundMeOpen} onClose={closeFoundMe} />
    </section>
  );
}
