import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { SectionHeader } from "../components/SectionHeader.js";
import { trackEvent } from "../lib/analytics.js";
import { MONOREPO } from "../lib/monorepo.js";
import { SITE } from "../lib/site.js";
import { ArchitectureGraph } from "../sections/architecture/ArchitectureGraph.js";

const CAPABILITY_GROUPS = ["frontend", "backend", "ops"] as const;

export function Monorepo() {
  const { t } = useTranslation();

  return (
    <>
      <header className="px-6 pb-20 pt-12 lg:px-10 lg:pb-28 lg:pt-16 2xl:px-16">
        <div className="grid gap-6 lg:grid-cols-[7rem_minmax(0,1fr)] lg:gap-12">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft lg:pt-12">
            {t("monorepo.index")}
          </p>
          <div>
            <Link
              to="/#work"
              className="mb-10 inline-flex items-center gap-2 font-mono text-sm text-ink-soft transition-colors duration-150 hover:text-accent"
            >
              <span aria-hidden>←</span>
              {t("monorepo.back")}
            </Link>
            <h1 className="mb-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {MONOREPO.title}
            </h1>
            <p className="mb-4 max-w-[68ch] text-xl leading-relaxed text-ink">
              {t("work.projects.aboutMe.outcome")}
            </p>
            <p className="mb-8 max-w-[68ch] leading-relaxed text-ink-soft">
              {t("monorepo.description")}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <ul className="flex flex-wrap gap-2">
                {MONOREPO.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded bg-surface px-2 py-1 font-mono text-xs text-ink-soft"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
              <a
                href={SITE.links.repo}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm text-accent transition-colors duration-150 hover:text-accent-hover"
                onClick={() =>
                  trackEvent("project_link_click", { project: MONOREPO.slug, kind: "repo" })
                }
              >
                {t("work.viewRepo")}
              </a>
            </div>
          </div>
        </div>
      </header>

      <SectionHeader id="inside" index="01 / INSIDE" title={t("monorepo.insideTitle")}>
        <dl className="border-t border-line">
          {MONOREPO.workspaces.map((workspace) => (
            <div
              key={workspace.key}
              className="grid gap-1 border-b border-line py-4 sm:grid-cols-[12rem_1fr] sm:gap-6"
            >
              <dt className="font-mono text-sm text-ink">{workspace.path}</dt>
              <dd className="max-w-[68ch] text-ink-soft">
                {t(`monorepo.workspaces.${workspace.key}`)}
              </dd>
            </div>
          ))}
        </dl>
      </SectionHeader>

      <SectionHeader id="stack" index="02 / STACK" title={t("work.capabilities")}>
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
                {MONOREPO.capabilities[key].join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-soft">{t("work.closing")}</p>
      </SectionHeader>

      <SectionHeader
        id="architecture"
        index="03 / ARCHITECTURE"
        title={t("monorepo.architectureTitle")}
        className="!pb-0"
      >
        <p className="mb-6 max-w-[68ch] text-ink-soft">{t("monorepo.architectureIntro")}</p>
        <ArchitectureGraph />
      </SectionHeader>
    </>
  );
}
