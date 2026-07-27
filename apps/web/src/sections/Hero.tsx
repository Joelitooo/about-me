import { useTranslation } from "react-i18next";

export function Hero() {
  const { t } = useTranslation();

  return (
    <section
      id="top"
      className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden px-4"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent)_0%,transparent_45%),linear-gradient(180deg,var(--color-canvas),var(--color-surface))] opacity-40"
      />
      <div className="relative mx-auto max-w-5xl py-20">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-ink-soft">
          {t("hero.greeting")}
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          {t("hero.name")}
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-ink-soft sm:text-xl">{t("hero.tagline")}</p>
        <a
          href="#contact"
          className="inline-flex rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          {t("hero.cta")}
        </a>
      </div>
    </section>
  );
}
