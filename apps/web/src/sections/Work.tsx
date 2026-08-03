import { useTranslation } from "react-i18next";

import { SectionHeader } from "../components/SectionHeader.js";
import { trackEvent } from "../lib/analytics.js";
import { SITE } from "../lib/site.js";

const CAPABILITIES = {
  frontend: ["React", "TypeScript", "Vite", "Tailwind CSS", "i18next"],
  backend: ["NestJS", "PostgreSQL", "Prisma"],
  ops: ["Docker", "GitHub Actions", "Cloudflare Tunnel", "nginx", "pnpm"],
} as const;

interface Project {
  slug: string;
  title: string;
  outcomeKey: string;
  repoUrl: string;
  liveUrl?: string;
  tags: string[];
}

const PROJECTS: Project[] = [
  {
    slug: "about-me",
    title: "Portfolio monorepo",
    outcomeKey: "work.projects.aboutMe.outcome",
    repoUrl: SITE.links.repo,
    liveUrl: "/",
    tags: ["React", "NestJS", "Docker", "CI/CD"],
  },
];

export function Work() {
  const { t } = useTranslation();

  return (
    <SectionHeader id="work" index="02 / WORK" title={t("work.title")}>
      <div className="space-y-14">
        <div>
          <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
            {t("work.capabilities")}
          </h3>
          <dl className="space-y-3 border-t border-line">
            {(
              [
                ["frontend", CAPABILITIES.frontend],
                ["backend", CAPABILITIES.backend],
                ["ops", CAPABILITIES.ops],
              ] as const
            ).map(([key, items]) => (
              <div
                key={key}
                className="grid gap-1 border-b border-line py-3 sm:grid-cols-[10rem_1fr] sm:gap-6"
              >
                <dt className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
                  {t(`work.${key}`)}
                </dt>
                <dd className="font-mono text-sm text-ink">{items.join(" · ")}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-ink-soft">{t("work.closing")}</p>
        </div>

        <div>
          <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
            {t("work.projectsTitle")}
          </h3>
          <ul className="border-t border-line">
            {PROJECTS.map((project) => (
              <li
                key={project.slug}
                className="grid gap-4 border-b border-line py-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
              >
                <div>
                  <h4 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
                    {project.title}
                  </h4>
                  <p className="mb-4 max-w-[68ch] text-ink-soft">{t(project.outcomeKey)}</p>
                  <ul className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded bg-surface px-2 py-1 font-mono text-xs text-ink-soft"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-4 font-mono text-sm">
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent transition-colors duration-150 hover:text-accent-hover"
                    onClick={() =>
                      trackEvent("project_link_click", { project: project.slug, kind: "repo" })
                    }
                  >
                    {t("work.viewRepo")}
                  </a>
                  {project.liveUrl ? (
                    <a
                      href={project.liveUrl}
                      className="text-accent transition-colors duration-150 hover:text-accent-hover"
                      onClick={() =>
                        trackEvent("project_link_click", { project: project.slug, kind: "live" })
                      }
                    >
                      {t("work.viewLive")}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionHeader>
  );
}
