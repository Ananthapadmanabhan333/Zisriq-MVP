/**
 * Which routes the session proxy lets through.
 *
 * This exists because of a bug that reached production: `/api/portal/*` was not
 * in the public list, so the proxy answered every client upload request with a
 * 307 to the login page. The portal page itself rendered perfectly — the failure
 * only appeared the moment a client actually picked a file. Nothing in the UI
 * looked wrong, and no page 500'd.
 *
 * `/api/cron/*` had the same fault, which would have meant reminders silently
 * never running.
 *
 * These routes are not unauthenticated. They carry their own credential — a
 * portal token, or CRON_SECRET — instead of a Supabase session.
 */
import { describe, expect, it } from "vitest";

import { isPublicRoute, isSignedOutOnlyRoute, PUBLIC_PREFIXES } from "@/lib/routes";

describe("routes that carry their own authentication", () => {
  it.each(["/api/portal/upload-url", "/api/portal/upload-confirm", "/api/cron/reminders"])(
    "%s must bypass the session proxy",
    (path) => {
      expect(isPublicRoute(path)).toBe(true);
    },
  );

  it.each(["/p/sometoken", "/invite/sometoken", "/auth/callback"])(
    "%s must be reachable without a session",
    (path) => {
      expect(isPublicRoute(path)).toBe(true);
    },
  );

  it("lets the landing page through", () => {
    expect(isPublicRoute("/")).toBe(true);
  });
});

describe("routes that require a session", () => {
  it.each([
    "/dashboard",
    "/clients",
    "/clients/abc-123",
    "/requests",
    "/requests/abc-123",
    "/templates",
    "/members",
    "/activity",
    "/settings",
    "/onboarding",
  ])("%s must NOT be public", (path) => {
    expect(isPublicRoute(path)).toBe(false);
  });

  it("does not let an unlisted api route through", () => {
    // Only /api/portal and /api/cron carry their own credential. Anything else
    // added under /api later must be a deliberate decision, not an accident.
    expect(isPublicRoute("/api/admin/wipe")).toBe(false);
    expect(isPublicRoute("/api/whatever")).toBe(false);
  });
});

describe("signed-out-only routes", () => {
  it.each(["/login", "/sign-up", "/forgot-password"])("%s bounces a signed-in user", (path) => {
    expect(isSignedOutOnlyRoute(path)).toBe(true);
  });

  it("does not bounce reset-password, which needs the recovery session", () => {
    // The recovery link signs the user in before they choose a new password.
    // Treating it as signed-out-only would redirect them away mid-reset.
    expect(isSignedOutOnlyRoute("/reset-password")).toBe(false);
  });

  it("does not bounce the invite page, which needs a signed-in user to accept", () => {
    expect(isSignedOutOnlyRoute("/invite/sometoken")).toBe(false);
  });
});

describe("the prefix list itself", () => {
  it("has no duplicates", () => {
    expect(new Set(PUBLIC_PREFIXES).size).toBe(PUBLIC_PREFIXES.length);
  });

  it("contains no bare '/', which would make every route public", () => {
    expect(PUBLIC_PREFIXES).not.toContain("/");
  });
});
