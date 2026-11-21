import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { SectionHeader } from "../components/SectionHeader.js";
import { trackEvent } from "../lib/analytics.js";
import { CV_CHECK } from "../lib/cvCheck.js";
import { MONOREPO } from "../lib/monorepo.js";

const REPO_TREE = `about-me/
├── apps/
│   ├── web
│   └── api
├── packages/shared
├── infra
└── .github/workflows`;

const CV_CHECK_TERMINAL = `$ cv-check "https://…/jobs/123"
→ reading Joel_Silva_CV
→ matching against posting
✓ Apply
✓ Joel_Silva_CV.pdf (1 page)`;

interface ProjectCardProps {
  preview: string;
  title: string;
  outcome: string;
  tags: readonly string[];
  path: string;
  slug: string;
  cta: string;
}

function ProjectCard({ preview, title, outcome, tags, path, slug, cta }: ProjectCardProps) {
  const { t } = useTranslation();

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-accent has-[:focus-visible]:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-canvas">
      <pre
        aria-hidden
        className="overflow-hidden border-b border-line bg-canvas px-6 py-8 font-mono text-sm leading-relaxed text-ink-soft transition-colors duration-200 group-hover:text-ink"
      >
        {preview}
      </pre>
      <div className="flex flex-1 flex-col p-6">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-accent">
          {t("work.card.eyebrow")}
        </p>
        <h3 className="mb-3 font-display text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h3>
        <p className="mb-5 text-ink-soft">{outcome}</p>
        <ul className="mb-8 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag} className="rounded bg-canvas px-2 py-1 font-mono text-xs text-ink-soft">
              {tag}
            </li>
          ))}
        </ul>
        <Link
          to={path}
          className="mt-auto inline-flex items-center gap-2 font-mono text-sm text-accent transition-colors duration-150 after:absolute after:inset-0 after:content-[''] hover:text-accent-hover focus-visible:outline-none"
          onClick={() => trackEvent("project_link_click", { project: slug, kind: "case_study" })}
        >
          {cta}
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

export function Work() {
  const { t } = useTranslation();

  return (
    <SectionHeader id="work" index="02 / WORK" title={t("work.title")}>
      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        <ProjectCard
          preview={REPO_TREE}
          title={MONOREPO.title}
          outcome={t("work.projects.aboutMe.outcome")}
          tags={MONOREPO.tags}
          path={MONOREPO.path}
          slug={MONOREPO.slug}
          cta={t("work.projects.aboutMe.cta")}
        />
        <ProjectCard
          preview={CV_CHECK_TERMINAL}
          title={CV_CHECK.title}
          outcome={t("work.projects.cvCheck.outcome")}
          tags={CV_CHECK.tags}
          path={CV_CHECK.path}
          slug={CV_CHECK.slug}
          cta={t("work.projects.cvCheck.cta")}
        />
      </div>
    </SectionHeader>
  );
}
