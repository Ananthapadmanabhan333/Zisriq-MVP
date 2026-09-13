import { defineConfig } from "vitest/config";
import { config } from "dotenv";

/**
 * Integration tests. These require a running local Supabase:
 *
 *   npm run db:start
 *   npm run db:reset
 *   npm run test:integration
 *
 * They authenticate as real seeded users and exercise RLS the way the
 * application will. Kept out of `npm test` so a developer without Docker
 * running still gets a green unit suite rather than a wall of connection errors.
 */
config({ path: ".env.local", quiet: true });

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // RLS probes mutate shared fixture rows; running files in parallel would
    // make them interfere with one another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: { junit: "./test-results/integration.xml" },
  },
});
