import { defineConfig } from "vitest/config";

import { testAliases } from "./tests/helpers/vitest-alias";

/**
 * Unit tests only — pure logic, no database. These run on every push and must
 * stay fast. Integration tests need a live Supabase and live in
 * vitest.integration.config.mts.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true, alias: testAliases },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "tests/integration/**", "node_modules/**"],
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: { junit: "./test-results/unit.xml" },
  },
});
