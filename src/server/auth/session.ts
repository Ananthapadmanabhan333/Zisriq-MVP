import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isRole, type Role } from "@/lib/permissions";

/**
 * The signed-in user together with the firm they are acting in.
 *
 * V1 gives a user exactly one membership, so "the firm" is unambiguous. If
 * multi-firm membership ever lands, this is the single place that has to learn
 * how to pick one, and every caller keeps working.
 */
export type Session = {
  userId: string;
  email: string;
  fullName: string | null;
  firmId: string;
  firmName: string;
  role: Role;
};

/**
 * Cached per request, so a page that asks in the layout, the page and three
 * components still makes one round trip.
 *
 * Returns null rather than throwing, so callers can decide between redirecting
 * (a page) and returning an error (an action).
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();

  // getUser() revalidates the JWT with the auth server on every call. getSession()
  // would only decode the cookie, which the client can forge.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("memberships")
    .select("role, firm_id, firms(name), profiles(full_name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const firm = Array.isArray(data.firms) ? data.firms[0] : data.firms;
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

  if (!firm || !isRole(data.role)) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? null,
    firmId: data.firm_id,
    firmName: firm.name,
    role: data.role,
  };
});

/** For pages and layouts behind the app shell. Sends the user somewhere useful. */
export async function requireSession(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const session = await getSession();
  // Signed in, but no firm yet — they still have to finish onboarding.
  if (!session) redirect("/onboarding");

  return session;
}
