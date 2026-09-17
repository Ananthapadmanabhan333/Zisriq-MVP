import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { clientEnv } from "@/lib/env/client";

/**
 * Refreshes the Supabase session cookie on every request, and keeps signed-out
 * users out of the app shell.
 *
 * This is a convenience redirect, not a security boundary. Anyone can call the
 * API directly; RLS is what actually stops them reading another firm's rows.
 * Treating this as the gate is how tenant leaks happen.
 *
 * Next.js 16 replaced the `middleware.ts` convention with `proxy.ts`. Keeping
 * the old filename silently disables it -- the file is simply never loaded, so
 * every route stays reachable signed out and nothing warns you at build time.
 */

/** Public: no session needed. Everything else behind `/` requires one. */
const PUBLIC_PREFIXES = [
  "/login",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/p/",
];

/** Reachable only when signed OUT. A signed-in user gets bounced to the app. */
const SIGNED_OUT_ONLY = ["/login", "/sign-up", "/forgot-password"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not remove: this refreshes an expiring token and writes the new cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    // Preserve where they were going, so sign-in lands them there.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (user && SIGNED_OUT_ONLY.some((p) => pathname.startsWith(p))) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = "/dashboard";
    dashboard.search = "";
    return NextResponse.redirect(dashboard);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation. The portal at
     * /p/:token is matched on purpose — it is public, but it still needs the
     * response pipeline, and listing it in PUBLIC_PREFIXES keeps that explicit.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
