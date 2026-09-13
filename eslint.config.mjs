import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

/**
 * The `server-only` package is what actually *enforces* the server boundary —
 * importing it from a client component fails the build. The rule below is a
 * faster, friendlier failure for the most common mistake, and
 * `scripts/audit-bundle.mjs` is the final backstop that inspects real build output.
 */
const serverBoundary = {
  files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/server", "@/server/*", "@/server/**"],
            message:
              "Server-only module. Pass data down as props, or call a server action instead.",
          },
          {
            group: ["@/lib/supabase/server"],
            message: "Use @/lib/supabase/browser in client components.",
          },
        ],
      },
    ],
  },
};

const unusedVars = {
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  serverBoundary,
  unusedVars,
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/types/database.ts",
    "playwright-report/**",
    "test-results/**",
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
