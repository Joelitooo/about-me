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
  /** Official brand colour, applied on hover. The SVGs are monochrome, so the
      hex has to travel alongside them. */
  color: string;
}

// Hand-placed rather than randomised: the scatter has to stay balanced and keep
// its densest marks away from the middle, because the headline sits there.
// Distance from the centre is deliberately uneven, so the set reads as a scatter
// rather than a ring around the copy. Positions were checked pairwise at the
// widest logo size, so neighbours clear each other without needing to shrink.
const LOGOS: TechLogo[] = [
  { name: "React", src: reactLogo, left: 12, top: 18, size: 58, rotate: -12, color: "#61DAFB" },
  {
    name: "TypeScript",
    src: typescriptLogo,
    left: 25,
    top: 14,
    size: 40,
    rotate: 8,
    color: "#3178C6",
  },
  { name: "Docker", src: dockerLogo, left: 38, top: 22, size: 46, rotate: -6, color: "#2496ED" },
  { name: "Vite", src: viteLogo, left: 52, top: 16, size: 52, rotate: 14, color: "#646CFF" },
  {
    name: "PostgreSQL",
    src: postgresqlLogo,
    left: 64,
    top: 24,
    size: 44,
    rotate: -10,
    color: "#4169E1",
  },
  {
    name: "Tailwind CSS",
    src: tailwindLogo,
    left: 78,
    top: 17,
    size: 56,
    rotate: 6,
    color: "#06B6D4",
  },
  { name: "Node.js", src: nodejsLogo, left: 89, top: 27, size: 42, rotate: -14, color: "#5FA04E" },
  { name: "Git", src: gitLogo, left: 32, top: 39, size: 34, rotate: 12, color: "#F05032" },
  { name: "NestJS", src: nestjsLogo, left: 15, top: 46, size: 50, rotate: 10, color: "#E0234E" },
  { name: "Prisma", src: prismaLogo, left: 29, top: 64, size: 38, rotate: -8, color: "#2D3748" },
  {
    name: "Cloudflare",
    src: cloudflareLogo,
    left: 11,
    top: 70,
    size: 54,
    rotate: 6,
    color: "#F38020",
  },
  {
    name: "GitHub Actions",
    src: githubActionsLogo,
    left: 29,
    top: 86,
    size: 40,
    rotate: -12,
    color: "#2088FF",
  },
  { name: "nginx", src: nginxLogo, left: 86, top: 48, size: 46, rotate: -9, color: "#009639" },
  {
    name: "JavaScript",
    src: javascriptLogo,
    left: 68,
    top: 42,
    size: 36,
    rotate: 13,
    color: "#F7DF1E",
  },
  { name: "pnpm", src: pnpmLogo, left: 89, top: 77, size: 42, rotate: -5, color: "#F69220" },
  { name: "Vitest", src: vitestLogo, left: 80, top: 64, size: 48, rotate: 9, color: "#6E9F18" },
  { name: "ESLint", src: eslintLogo, left: 16, top: 88, size: 44, rotate: 7, color: "#4B32C3" },
  { name: "HTML5", src: html5Logo, left: 39, top: 90, size: 38, rotate: -11, color: "#E34F26" },
  { name: "CSS", src: cssLogo, left: 48, top: 75, size: 46, rotate: 5, color: "#663399" },
  { name: "i18next", src: i18nextLogo, left: 59, top: 90, size: 40, rotate: -7, color: "#26A69A" },
  {
    name: "Prettier",
    src: prettierLogo,
    left: 70,
    top: 83,
    size: 52,
    rotate: 11,
    color: "#F7B93E",
  },
];

// Small screens only have room for the top and bottom bands, and only for three
// marks per band: the columns are spaced for a wide box, so any more of them
// collide once the box is phone-width.
const COMPACT = new Set(["React", "Vite", "Node.js", "ESLint", "CSS", "Prettier"]);

export function TechBackdrop() {
  return (
    <div
      aria-hidden
      className="tech-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden text-ink"
    >
      {LOGOS.map((logo, index) => (
        <span
          key={logo.name}
          // Hover lives on the marks themselves, so the gaps between them stay
          // transparent to the pointer.
          className={`tech-backdrop__item pointer-events-auto absolute ${COMPACT.has(logo.name) ? "" : "hidden sm:block"}`}
          // The per-logo values sit on the wrapper rather than the mark itself
          // because the label has to read the mark's size to clear it.
          style={
            {
              left: `${logo.left}%`,
              top: `${logo.top}%`,
              // Coprime multipliers spread the drift so neighbours never sync up.
              "--tech-duration": `${9 + ((index * 7) % 5) * 0.9}s`,
              "--tech-delay": `${((index * 13) % 9) * 0.5}s`,
              "--tech-logo": `url("${logo.src}")`,
              "--tech-size": `${logo.size}px`,
              "--tech-color": logo.color,
              // The tilt travels as a variable so the hover zoom can be composed
              // with it in the stylesheet instead of being overridden here.
              "--tech-rotate": `${logo.rotate}deg`,
            } as CSSProperties
          }
        >
          <span className="tech-backdrop__logo block" />
          <span
            className={`tech-backdrop__label font-mono text-xs uppercase tracking-[0.14em] text-ink-soft ${
              logo.top > 76 ? "tech-backdrop__label--above" : ""
            }`}
          >
            {logo.name}
          </span>
        </span>
      ))}
    </div>
  );
}
