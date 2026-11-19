import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { SectionHeader } from "../components/SectionHeader.js";
import { trackEvent } from "../lib/analytics.js";
import { CV_CHECK } from "../lib/cvCheck.js";

const CAPABILITY_GROUPS = ["frontend", "backend", "ops"] as const;
const FLOW_STEPS = ["read", "match", "tailor", "fit", "log"] as const;

export function CvCheck() {
  const { t } = useTranslation();

  return (
    <>
      <header className="px-6 pb-20 pt-12 lg:px-10 lg:pb-28 lg:pt-16 2xl:px-16">
        <div className="grid gap-6 lg:grid-cols-[7rem_minmax(0,1fr)] lg:gap-12">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft lg:pt-12">
            {t("cvCheck.index")}
          </p>
          <div>
            <Link
              to="/#work"
              className="mb-10 inline-flex items-center gap-2 font-mono text-sm text-ink-soft transition-colors duration-150 hover:text-accent"
            >
              <span aria-hidden>←</span>
              {t("cvCheck.back")}
            </Link>
            <h1 className="mb-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {CV_CHECK.title}
            </h1>
            <p className="mb-4 max-w-[68ch] text-xl leading-relaxed text-ink">
              {t("work.projects.cvCheck.outcome")}
            </p>
            <p className="mb-8 max-w-[68ch] leading-relaxed text-ink-soft">
              {t("cvCheck.description")}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <ul className="flex flex-wrap gap-2">
                {CV_CHECK.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded bg-surface px-2 py-1 font-mono text-xs text-ink-soft"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
              <a
                href={CV_CHECK.repo}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm text-accent transition-colors duration-150 hover:text-accent-hover"
                onClick={() =>
                  trackEvent("project_link_click", { project: CV_CHECK.slug, kind: "repo" })
                }
              >
                {t("work.viewRepo")}
              </a>
            </div>
          </div>
        </div>
      </header>

      <SectionHeader id="flow" index="01 / FLOW" title={t("cvCheck.flowTitle")}>
        <ol className="border-t border-line">
          {FLOW_STEPS.map((step, i) => (
            <li
              key={step}
              className="grid gap-1 border-b border-line py-4 sm:grid-cols-[12rem_1fr] sm:gap-6"
            >
              <span className="font-mono text-sm text-ink">
                {String(i + 1).padStart(2, "0")} · {t(`cvCheck.flow.${step}.title`)}
              </span>
              <span className="max-w-[68ch] text-ink-soft">{t(`cvCheck.flow.${step}.body`)}</span>
            </li>
          ))}
        </ol>
      </SectionHeader>

      <SectionHeader id="inside" index="02 / INSIDE" title={t("cvCheck.insideTitle")}>
        <dl className="border-t border-line">
          {CV_CHECK.modules.map((module) => (
            <div
              key={module.key}
              className="grid gap-1 border-b border-line py-4 sm:grid-cols-[12rem_1fr] sm:gap-6"
            >
              <dt className="font-mono text-sm text-ink">{module.path}</dt>
              <dd className="max-w-[68ch] text-ink-soft">{t(`cvCheck.modules.${module.key}`)}</dd>
            </div>
          ))}
        </dl>
      </SectionHeader>

      <SectionHeader
        id="stack"
        index="03 / STACK"
        title={t("work.capabilities")}
        className="!pb-16 lg:!pb-24"
      >
        <dl className="space-y-3 border-t border-line">
          {CAPABILITY_GROUPS.map((key) => (
            <div
              key={key}
              className="grid gap-1 border-b border-line py-3 sm:grid-cols-[10rem_1fr] sm:gap-6"
            >
              <dt className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
                {t(`work.${key}`)}
              </dt>
              <dd className="font-mono text-sm text-ink">
                {CV_CHECK.capabilities[key].join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-soft">{t("cvCheck.honesty")}</p>
      </SectionHeader>
    </>
  );
}
