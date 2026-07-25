import { useTranslation } from "react-i18next";

const SKILLS = [
  "TypeScript",
  "React",
  "Vite",
  "NestJS",
  "PostgreSQL",
  "Docker",
  "Tailwind CSS",
  "pnpm",
] as const;

export function Skills() {
  const { t } = useTranslation();

  return (
    <section id="skills" className="scroll-mt-20 bg-surface px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-3xl font-bold tracking-tight text-ink">{t("skills.title")}</h2>
        <ul className="flex flex-wrap gap-3">
          {SKILLS.map((skill) => (
            <li
              key={skill}
              className="rounded-md border border-ink/10 bg-canvas px-3 py-2 text-sm text-ink"
            >
              {skill}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
