export const CV_CHECK = {
  slug: "cv-check",
  path: "/cv-check",
  title: "cv-check",
  repo: "https://github.com/Joelitooo/cv-check",
  tags: ["TypeScript", "Node.js", "Cursor SDK", "Docker"],
  modules: [
    { path: "src/cli.ts", key: "cli" },
    { path: "src/server.ts", key: "server" },
    { path: "src/agent.ts", key: "agent" },
    { path: "src/tailor.ts", key: "tailor" },
    { path: "src/pdf.ts", key: "pdf" },
    { path: "src/tracker.ts", key: "tracker" },
    { path: "web/index.html", key: "web" },
  ],
  capabilities: {
    frontend: ["HTML", "CSS", "JavaScript"],
    backend: ["Node.js", "TypeScript", "Cursor SDK", "Headless Chrome"],
    ops: ["Docker Compose", "Colima", "tsx", "npm"],
  },
} as const;
