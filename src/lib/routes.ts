/**
 * Which routes the session proxy lets through.
 *
 * Kept here, pure and dependency-free, rather than inside `proxy.ts` — that
 * module imports the env schema, so anything living there cannot be unit tested.
 * This list is exactly the kind of thing that needs a test: getting it wrong
 * fails silently in a way no page renders.
 *
 * Being listed here does NOT mean "unauthenticated". It means "this route
 * carries its own authentication rather than a Supabase session":
 *
 *   /api/portal/*  — the portal token in the request body IS the credential
 *   /api/cron/*    — CRON_SECRET as a bearer token, compared in constant time
 *   /p/*           — the token in the URL
 *   /invite/*      — the invite token in the URL
 *
 * Omitting /api/portal is how client uploads broke in production: the portal
 * page rendered fine, and the upload request was answered with a login page.
 */

export const PUBLIC_PREFIXES = [
  "/login",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/invite/",
  "/auth",
  "/p/",
  "/api/portal",
  "/api/cron",
] as const;

/** Reachable only when signed OUT. A signed-in user gets bounced to the app. */
export const SIGNED_OUT_ONLY = ["/login", "/sign-up", "/forgot-password"] as const;

export function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export function isSignedOutOnlyRoute(pathname: string): boolean {
  return SIGNED_OUT_ONLY.some((prefix) => pathname.startsWith(prefix));
}
