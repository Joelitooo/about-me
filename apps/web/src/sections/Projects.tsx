import { useTranslation } from "react-i18next";

interface ProjectCard {
  title: string;
  description: string;
  repoUrl: string;
  tags: string[];
}

const PROJECTS: ProjectCard[] = [
  {
    title: "Portfolio Monorepo",
    description: "Vite + React SPA and NestJS API in a pnpm monorepo.",
    repoUrl: "https://github.com/you/about-me",
    tags: ["React", "NestJS", "TypeScript"],
  },
  {
    title: "Side Project",
    description: "A sample project card used as Phase 1 placeholder content.",
    repoUrl: "https://github.com/you/other",
    tags: ["TypeScript"],
  },
];

export function Projects() {
  const { t } = useTranslation();

  return (
    <section id="projects" className="scroll-mt-20 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-3xl font-bold tracking-tight text-ink">{t("projects.title")}</h2>
        <ul className="grid gap-6 md:grid-cols-2">
          {PROJECTS.map((project) => (
            <li key={project.title} className="rounded-lg border border-ink/10 bg-surface p-6">
              <h3 className="mb-2 text-xl font-semibold text-ink">{project.title}</h3>
              <p className="mb-4 text-ink-soft">{project.description}</p>
              <ul className="mb-4 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded bg-canvas px-2 py-1 text-xs font-medium text-ink-soft"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                {t("projects.viewRepo")}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
