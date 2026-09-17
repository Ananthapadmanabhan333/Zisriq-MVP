"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/server/env";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import { formFields } from "@/lib/forms";
import { fail, fromZodError, ok, type ActionResult } from "./types";

/** Only allow in-app destinations, so `?next=` cannot bounce to another site. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function signUp(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the handle_new_user trigger to populate profiles.full_name.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${serverEnv.APP_URL}/auth/callback`,
    },
  });

  if (error) {
    // Supabase returns this when the email is taken. Say so plainly: the address
    // is one the person just typed, so confirming it is not a disclosure, and
    // being coy here just strands people who forgot they had an account.
    if (error.code === "user_already_exists" || error.message.includes("already registered")) {
      return fail("An account with that email already exists. Try signing in instead.");
    }
    if (error.code === "weak_password") {
      return fail("That password is too easy to guess. Try a longer one.", {
        password: ["Too weak"],
      });
    }
    return fail(error.message);
  }

  // A brand-new user has no firm yet, so onboarding is always next.
  redirect("/onboarding");
}

export async function login(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately identical for "no such user" and "wrong password", so this
    // form cannot be used to enumerate which emails have accounts.
    return fail("That email and password do not match.");
  }

  redirect(safeNext(parsed.data.next));
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${serverEnv.APP_URL}/auth/callback?next=/reset-password`,
  });

  // Reports success whether or not the address exists — otherwise this endpoint
  // tells an attacker which emails are registered.
  return ok();
}

export async function resetPassword(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();

  // The recovery link has already established a session by this point; without
  // one there is nothing to update, which is what stops a bare POST here working.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("That reset link has expired. Request a new one.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.message);

  redirect("/dashboard");
}
