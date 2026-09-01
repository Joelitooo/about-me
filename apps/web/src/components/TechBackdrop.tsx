import type { CSSProperties } from "react";

import cloudflareLogo from "../assets/logos/cloudflare.svg";
import cssLogo from "../assets/logos/css.svg";
import dockerLogo from "../assets/logos/docker.svg";
import eslintLogo from "../assets/logos/eslint.svg";
import gitLogo from "../assets/logos/git.svg";
import githubActionsLogo from "../assets/logos/githubactions.svg";
import html5Logo from "../assets/logos/html5.svg";
import i18nextLogo from "../assets/logos/i18next.svg";
import javascriptLogo from "../assets/logos/javascript.svg";
import nestjsLogo from "../assets/logos/nestjs.svg";
import nginxLogo from "../assets/logos/nginx.svg";
import nodejsLogo from "../assets/logos/nodedotjs.svg";
import pnpmLogo from "../assets/logos/pnpm.svg";
import postgresqlLogo from "../assets/logos/postgresql.svg";
import prettierLogo from "../assets/logos/prettier.svg";
import prismaLogo from "../assets/logos/prisma.svg";
import reactLogo from "../assets/logos/react.svg";
import tailwindLogo from "../assets/logos/tailwindcss.svg";
import typescriptLogo from "../assets/logos/typescript.svg";
import viteLogo from "../assets/logos/vite.svg";
import vitestLogo from "../assets/logos/vitest.svg";

interface TechLogo {
  name: string;
  src: string;
  /** Percentage of the section box; the logo is centred on this point. */
  left: number;
  top: number;
  size: number;
  rotate: number;
}

// Hand-placed rather than randomised: the scatter has to stay balanced and leave
// the middle of the box empty, because the headline sits there.
const LOGOS: TechLogo[] = [
  { name: "React", src: reactLogo, left: 8, top: 12, size: 58, rotate: -12 },
  { name: "TypeScript", src: typescriptLogo, left: 20, top: 6, size: 40, rotate: 8 },
  { name: "Docker", src: dockerLogo, left: 33, top: 17, size: 46, rotate: -6 },
  { name: "Vite", src: viteLogo, left: 46, top: 7, size: 52, rotate: 14 },
  { name: "PostgreSQL", src: postgresqlLogo, left: 58, top: 15, size: 44, rotate: -10 },
  { name: "Tailwind CSS", src: tailwindLogo, left: 71, top: 7, size: 56, rotate: 6 },
  { name: "Node.js", src: nodejsLogo, left: 84, top: 14, size: 42, rotate: -14 },
  { name: "Git", src: gitLogo, left: 94, top: 5, size: 34, rotate: 12 },
  { name: "NestJS", src: nestjsLogo, left: 5, top: 34, size: 50, rotate: 10 },
  { name: "Prisma", src: prismaLogo, left: 14, top: 49, size: 38, rotate: -8 },
  { name: "Cloudflare", src: cloudflareLogo, left: 4, top: 63, size: 54, rotate: 6 },
  { name: "GitHub Actions", src: githubActionsLogo, left: 16, top: 75, size: 40, rotate: -12 },
  { name: "nginx", src: nginxLogo, left: 86, top: 33, size: 46, rotate: -9 },
  { name: "JavaScript", src: javascriptLogo, left: 95, top: 46, size: 36, rotate: 13 },
  { name: "pnpm", src: pnpmLogo, left: 90, top: 61, size: 42, rotate: -5 },
  { name: "Vitest", src: vitestLogo, left: 93, top: 71, size: 48, rotate: 9 },
  { name: "ESLint", src: eslintLogo, left: 10, top: 89, size: 44, rotate: 7 },
  { name: "HTML5", src: html5Logo, left: 26, top: 94, size: 38, rotate: -11 },
  { name: "CSS", src: cssLogo, left: 41, top: 85, size: 46, rotate: 5 },
  { name: "i18next", src: i18nextLogo, left: 56, top: 93, size: 40, rotate: -7 },
  { name: "Prettier", src: prettierLogo, left: 70, top: 86, size: 52, rotate: 11 },
];

// Small screens only have room for the top and bottom bands; the rest would
// land on the headline.
const COMPACT = new Set([
  "React",
  "TypeScript",
  "Vite",
  "Tailwind CSS",
  "Node.js",
  "ESLint",
  "CSS",
  "i18next",
  "Prettier",
]);

export function TechBackdrop() {
  return (
    <div
      aria-hidden
      className="tech-backdrop pointer-events-none absolute inset-0 overflow-hidden text-ink opacity-[0.16] dark:opacity-[0.22]"
    >
      {LOGOS.map((logo, index) => (
        <span
          key={logo.name}
          className={`tech-backdrop__item absolute ${COMPACT.has(logo.name) ? "" : "hidden sm:block"}`}
          style={
            {
              left: `${logo.left}%`,
              top: `${logo.top}%`,
              // Coprime multipliers spread the drift so neighbours never sync up.
              "--tech-duration": `${9 + ((index * 7) % 5) * 0.9}s`,
              "--tech-delay": `${((index * 13) % 9) * 0.5}s`,
            } as CSSProperties
          }
        >
          <span
            className="tech-backdrop__logo block"
            style={
              {
                "--tech-logo": `url("${logo.src}")`,
                "--tech-size": `${logo.size}px`,
                transform: `rotate(${logo.rotate}deg)`,
              } as CSSProperties
            }
          />
        </span>
      ))}
    </div>
  );
}
