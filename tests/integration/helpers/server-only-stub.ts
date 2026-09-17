/**
 * Stands in for the `server-only` package under Vitest.
 *
 * That package throws on import outside a React Server Component, which is
 * exactly what it is for — but these integration tests ARE server-side code
 * exercising server-side modules, in a plain Node process with no React
 * renderer. Without this alias, importing any service under test fails before a
 * single assertion runs.
 *
 * This weakens nothing: the real package is still imported by the real build,
 * where the bundler enforces the boundary.
 */
export {};
