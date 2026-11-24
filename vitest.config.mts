import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * One Vitest run for the whole monorepo. Each workspace package is a "project" so it
 * keeps its own aliases and environment. Tests live in each package's `tests/` folder,
 * next to `src/`: `tests/unit` for pure logic, `tests/integration` for anything that
 * needs a database or other services.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["apps/*/src/**", "packages/*/src/**"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
    projects: [
      {
        extends: false,
        resolve: { alias: { "@": path.resolve(import.meta.dirname, "apps/api/src") } },
        test: {
          name: "api",
          root: "apps/api",
          environment: "node",
          include: ["tests/**/*.test.ts"],
        },
      },
      {
        extends: false,
        test: {
          name: "db",
          root: "packages/db",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          // Integration tests share one database, so they must not run in parallel.
          fileParallelism: false,
        },
      },
      {
        extends: false,
        test: {
          name: "shared",
          root: "packages/shared",
          environment: "node",
          include: ["tests/**/*.test.ts"],
        },
      },
    ],
  },
});
