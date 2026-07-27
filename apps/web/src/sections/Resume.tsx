import { useTranslation } from "react-i18next";

export function Resume() {
  const { t } = useTranslation();

  return (
    <section id="resume" className="scroll-mt-20 bg-surface px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-ink">{t("resume.title")}</h2>
        <a
          href="/resume.pdf"
          download
          className="inline-flex rounded-md border border-ink/15 bg-canvas px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent"
        >
          {t("resume.download")}
        </a>
      </div>
    </section>
  );
}
