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
        "lib/types.ts",
      ],
      thresholds: {
        lines: 87.21,
        functions: 80.95,
        branches: 77.54,
        statements: 84.65,
        "app/api/vote/route.ts": {
          lines: 62.5,
          functions: 100,
          branches: 75,
          statements: 62.5,
        },
        "app/api/use/route.ts": {
          lines: 100,
          functions: 100,
          branches: 85,
          statements: 100,
        },
        "app/api/cron/ingest/route.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "app/api/cron/generate-covers/route.ts": {
          lines: 96.42,
          functions: 75,
          branches: 95,
          statements: 93.54,
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
          branches: 66.66,
          statements: 84.21,
        },
        "lib/ip-hash.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "lib/request-security.ts": {
          lines: 95.34,
          functions: 83.33,
          branches: 79.31,
          statements: 86.27,
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
