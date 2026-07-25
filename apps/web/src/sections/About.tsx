import { useTranslation } from "react-i18next";

export function About() {
  const { t } = useTranslation();

  return (
    <section id="about" className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-ink">{t("about.title")}</h2>
        <p className="max-w-3xl text-lg leading-relaxed text-ink-soft">{t("about.body")}</p>
      </div>
    </section>
  );
}
