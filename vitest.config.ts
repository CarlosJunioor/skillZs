import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["app/api/**/*.ts", "lib/**/*.ts"],
      exclude: [
        "lib/supabase/server.ts",
        "lib/theme-bootstrap.ts",
        "lib/types.ts",
      ],
      thresholds: {
        lines: 84.08,
        functions: 84.11,
        branches: 85.68,
        statements: 84.08,
        "app/api/vote/route.ts": {
          lines: 69.04,
          functions: 100,
          branches: 80,
          statements: 69.04,
        },
        "app/api/use/route.ts": {
          lines: 97.61,
          functions: 100,
          branches: 83.33,
          statements: 97.61,
        },
        "app/api/cron/ingest/route.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "app/api/cron/generate-covers/route.ts": {
          lines: 93.61,
          functions: 75,
          branches: 94.73,
          statements: 93.61,
        },
        "lib/csp.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "lib/cron-auth.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "lib/interactions.ts": {
          lines: 100,
          functions: 100,
          branches: 60,
          statements: 100,
        },
        "lib/ip-hash.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "lib/request-security.ts": {
          lines: 94.02,
          functions: 100,
          branches: 77.77,
          statements: 94.02,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
});