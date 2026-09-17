"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createFirmSchema } from "@/lib/validation/firm";
import { formFields } from "@/lib/forms";
import { fail, fromZodError, type ActionResult } from "./types";

/**
 * Creates a firm and makes the caller its admin.
 *
 * Both rows must land together — a firm with no members is unreachable, and a
 * membership pointing at no firm is worse. The pair is created by a single
 * `app.create_firm_with_owner()` call so the database applies them in one
 * transaction; doing it as two statements from here would leave a window where
 * a crash strands the user with an orphaned firm they cannot see or delete.
 */
export async function createFirm(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = createFirmSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // One firm per user in V1. Re-running onboarding must not mint a second.
  const { data: existing } = await supabase
    .from("memberships")
    .select("firm_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  const { error } = await supabase.rpc("create_firm_with_owner", {
    p_name: parsed.data.name,
  });

  if (error) return fail(error.message);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
