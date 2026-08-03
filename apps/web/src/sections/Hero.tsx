import { useTranslation } from "react-i18next";

import portraitJpg from "../assets/portrait.jpg";
import portraitJpg1x from "../assets/portrait-1x.jpg";
import portraitWebp from "../assets/portrait.webp";
import portraitWebp1x from "../assets/portrait-1x.webp";
import { trackEvent } from "../lib/analytics.js";
import { SITE } from "../lib/site.js";

export function Hero() {
  const { t } = useTranslation();

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

      <div className="relative grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <div>
          <p className="mb-5 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft sm:text-sm sm:normal-case sm:tracking-normal">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-accent motion-safe:animate-pulse"
            />
            <span>{t("hero.status")}</span>
          </p>

          <h1 className="mb-5 font-display text-6xl font-semibold leading-[0.95] tracking-tight text-ink sm:text-8xl">
            {SITE.name}
          </h1>

          <p className="mb-8 max-w-[36ch] text-lg text-ink-soft sm:text-xl">{t("hero.tagline")}</p>

          <div className="flex flex-wrap gap-3">
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
              className="inline-flex rounded-md border border-line px-5 py-3 text-sm font-semibold text-ink transition-[border-color,color] duration-150 hover:border-accent"
              onClick={() => {
                trackEvent("cv_download", { source: "hero" });
                trackEvent("hero_cta_click", { target: "cv" });
              }}
            >
              {t("hero.ctaCv")}
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-md">
          <div
            aria-hidden
            className="absolute -bottom-3 -right-3 h-full w-full bg-accent motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
          />
          <div className="hero-photo-frame relative overflow-hidden border border-line bg-surface">
            <picture>
              <source
                type="image/webp"
                srcSet={`${portraitWebp1x} 400w, ${portraitWebp} 800w`}
                sizes="(min-width: 1024px) 28rem, 20rem"
              />
              <img
                src={portraitJpg}
                srcSet={`${portraitJpg1x} 400w, ${portraitJpg} 800w`}
                sizes="(min-width: 1024px) 28rem, 20rem"
                alt={SITE.name}
                width={800}
                height={1000}
                className="aspect-[4/5] w-full object-cover [filter:sepia(0.12)_saturate(0.95)_contrast(1.02)]"
                decoding="async"
                fetchPriority="high"
              />
            </picture>
          </div>
        </div>
      </div>
    </section>
  );
}
