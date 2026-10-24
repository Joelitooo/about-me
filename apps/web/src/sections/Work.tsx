import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { SectionHeader } from "../components/SectionHeader.js";
import { trackEvent } from "../lib/analytics.js";
import { MONOREPO } from "../lib/monorepo.js";

const REPO_TREE = `about-me/
├── apps/
│   ├── web
│   └── api
├── packages/shared
├── infra
└── .github/workflows`;

export function Work() {
  const { t } = useTranslation();

  return (
    <SectionHeader id="work" index="02 / WORK" title={t("work.title")}>
      <div className="flex justify-center">
        <article className="group relative flex w-full max-w-sm flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-accent has-[:focus-visible]:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-canvas">
          <pre
            aria-hidden
            className="border-b border-line bg-canvas px-6 py-8 font-mono text-sm leading-relaxed text-ink-soft transition-colors duration-200 group-hover:text-ink"
          >
            {REPO_TREE}
          </pre>
          <div className="flex flex-1 flex-col p-6">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-accent">
              {t("work.card.eyebrow")}
            </p>
            <h3 className="mb-3 font-display text-2xl font-semibold tracking-tight text-ink">
              {MONOREPO.title}
            </h3>
            <p className="mb-5 text-ink-soft">{t("work.projects.aboutMe.outcome")}</p>
            <ul className="mb-8 flex flex-wrap gap-2">
              {MONOREPO.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded bg-canvas px-2 py-1 font-mono text-xs text-ink-soft"
                >
                  {tag}
                </li>
              ))}
            </ul>
            <Link
              to={MONOREPO.path}
              className="mt-auto inline-flex items-center gap-2 font-mono text-sm text-accent transition-colors duration-150 after:absolute after:inset-0 after:content-[''] hover:text-accent-hover focus-visible:outline-none"
              onClick={() =>
                trackEvent("project_link_click", { project: MONOREPO.slug, kind: "case_study" })
              }
            >
              {t("work.card.cta")}
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </article>
      </div>
    </SectionHeader>
  );
}
