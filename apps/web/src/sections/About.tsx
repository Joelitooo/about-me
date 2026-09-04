import { useTranslation, Trans } from "react-i18next";

import { SectionHeader } from "../components/SectionHeader.js";
import { trackEvent } from "../lib/analytics.js";
import { SITE } from "../lib/site.js";

interface ExperienceItem {
  role: string;
  company: string;
  period: string;
}

const EXPERIENCE: ExperienceItem[] = [
  {
    role: "Frontend Software Engineer",
    company: "eDreams",
    period: "Sep 2022 – present",
  },
  {
    role: "Frontend Intern (6 months)",
    company: "Swogo",
    period: "Jan 2022 – Jun 2022",
  },
];

export function About() {
  const { t } = useTranslation();

  return (
    <SectionHeader id="about" index="01 / ABOUT" title={t("about.title")}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)] lg:gap-16">
        <div className="max-w-[68ch] space-y-5">
          <p className="text-xl leading-relaxed text-ink">
            <Trans
              i18nKey="about.lede"
              components={{
                name: <strong className="font-black text-ink decoration-accent" />,
                years: <strong className="font-black text-ink decoration-accent" />,
              }}
            />
          </p>
          <p className="leading-relaxed text-ink-soft"> <Trans
            i18nKey="about.p2"
            components={{
              bsc: <strong className="font-normal underline text-ink decoration-accent" />,
            }}
          /></p>
          <p className="leading-relaxed text-ink-soft">
            <Trans
              i18nKey="about.p3"
              components={{
                lifeStage: <strong className="font-normal underline text-ink decoration-accent" />,
              }}
            />
          </p>
          <p className="leading-relaxed text-ink-soft">{t("about.p4")}</p>
          <p className="leading-relaxed text-ink-soft"> <Trans
            i18nKey="about.p5"
            components={{
              react: <span className="font-light text-ink decoration-accent"/>,
            }}
          />
          </p>
          <div className="pt-4">
            <h3 className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
              {t("about.experienceTitle")}
            </h3>
            <ul className="space-y-4 border-t border-line">
              {EXPERIENCE.map((item) => (
                <li
                  key={`${item.company}-${item.period}`}
                  className="grid gap-1 border-b border-line py-4 sm:grid-cols-[1fr_auto] sm:items-baseline"
                >
                  <div>
                    <p className="font-medium text-ink">{item.role}</p>
                    <p className="text-ink-soft">{item.company}</p>
                  </div>
                  <p className="font-mono text-xs text-ink-soft sm:text-right">{item.period}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-6 lg:pt-1">
          <ul className="space-y-3 font-mono text-sm text-ink-soft">
            <li>{t("about.facts.role")}</li>
            <li>{t("about.facts.location")}</li>
            <li>{t("about.facts.experience")}</li>
            <li>{t("about.facts.education")}</li>
            <li>{t("about.facts.languages")}</li>
            <li>{t("about.facts.availability")}</li>
          </ul>

          <div className="space-y-2">
            <a
              href="/resume.pdf"
              download
              className="inline-flex rounded-md bg-accent px-5 py-3 text-sm font-semibold text-on-accent transition-[background-color,color] duration-150 hover:bg-accent-hover"
              onClick={() => trackEvent("cv_download", { source: "about" })}
            >
              {t("about.downloadCv")}
            </a>
            <p className="font-mono text-xs text-ink-soft">
              {t("about.cvUpdated", { date: SITE.cvUpdated })}
            </p>
          </div>
        </aside>
      </div>
    </SectionHeader>
  );
}
