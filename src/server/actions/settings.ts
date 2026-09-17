"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { formFields } from "@/lib/forms";
import { assertCan, PermissionError } from "@/lib/permissions";
import { reminderCadenceSchema } from "@/lib/validation/firm";
import { requireSession } from "@/server/auth/session";
import { fail, fromZodError, ok, type ActionResult } from "./types";

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Enter your firm's name").max(200),
  emailSenderName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => v ?? ""),
  /**
   * Arrives as "3,7" from a text input. Parsed and range-checked here rather
   * than in a CHECK constraint, because Postgres rejects a CHECK containing a
   * subquery and an earlier attempt to do it in SQL failed for that reason.
   */
  followUpDays: z
    .string()
    .trim()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map(Number),
    )
    .refine((days) => days.every(Number.isInteger), "Use whole numbers, separated by commas")
    .pipe(reminderCadenceSchema),
  overdueEveryDays: z.coerce
    .number()
    .int()
    .min(1, "Chase at least a day apart")
    .max(30, "More than 30 days apart is not a reminder"),
  overdueCap: z.coerce.number().int().min(0).max(20, "Twenty notices is harassment, not diligence"),
  portalTokenTtlDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(365, "A link that lives a year is a link that leaks"),
});

export async function updateFirmSettings(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "firm.updateSettings");
  } catch (error) {
    if (error instanceof PermissionError) {
      return fail("Only an admin can change firm settings.");
    }
    throw error;
  }

  const parsed = settingsSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("firms")
    .update({
      name: parsed.data.name,
      email_sender_name: parsed.data.emailSenderName,
      reminder_follow_up_days: parsed.data.followUpDays,
      reminder_overdue_every_days: parsed.data.overdueEveryDays,
      reminder_overdue_cap: parsed.data.overdueCap,
      portal_token_ttl_days: parsed.data.portalTokenTtlDays,
    })
    .eq("id", session.firmId);

  if (error) return fail(error.message);

  revalidatePath("/", "layout");
  return ok();
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function updateProfile(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = profileSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", session.userId);

  if (error) return fail(error.message);

  revalidatePath("/", "layout");
  return ok();
}
