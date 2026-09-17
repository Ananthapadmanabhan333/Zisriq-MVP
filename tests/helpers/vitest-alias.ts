import { fileURLToPath } from "node:url";

/**
 * Module aliases shared by the unit and integration Vitest configs.
 *
 * `server-only` throws on import outside a React Server Component — which is
 * exactly its job, and exactly what makes server modules untestable in a plain
 * Node process. Both suites ARE server-side code, so both stub it out. The real
 * package still guards the real build, where the bundler enforces the boundary.
 *
 * Kept in one place so the two configs cannot drift.
 */
export const testAliases = {
  "server-only": fileURLToPath(new URL("./server-only-stub.ts", import.meta.url)),
};
