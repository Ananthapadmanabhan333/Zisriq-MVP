import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges the one-time code on an email link (confirmation, recovery, invite)
 * for a session cookie, then forwards the user on.
 *
 * `next` is constrained to in-app paths: an open redirect here would let an
 * attacker send a genuine Zisriq email link that lands on their own page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  const raw = searchParams.get("next") ?? "/dashboard";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
