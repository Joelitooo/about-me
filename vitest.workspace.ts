import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "shared",
      root: "./packages/shared",
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  },
  // Phase 1 appends: apps/web (environment: "jsdom", RTL setup)
  // Phase 2 appends: apps/api (environment: "node", Supertest/Testcontainers)
]);
