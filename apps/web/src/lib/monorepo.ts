export const MONOREPO = {
  slug: "about-me",
  path: "/monorepo",
  title: "Portfolio monorepo",
  tags: ["React", "NestJS", "Docker", "CI/CD"],
  workspaces: [
    { path: "apps/web", key: "web" },
    { path: "apps/api", key: "api" },
    { path: "packages/shared", key: "shared" },
    { path: "infra", key: "infra" },
    { path: ".github/workflows", key: "ci" },
  ],
  capabilities: {
    frontend: ["React", "TypeScript", "Vite", "Tailwind CSS", "i18next"],
    backend: ["NestJS", "PostgreSQL", "Prisma"],
    ops: ["Docker", "GitHub Actions", "Cloudflare Tunnel", "nginx", "pnpm"],
  },
} as const;
