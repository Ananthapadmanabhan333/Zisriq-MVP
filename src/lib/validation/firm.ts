import { z } from "zod";

import { ROLES } from "@/lib/permissions";

const firmName = z
  .string()
  .trim()
  .min(2, "Enter your firm's name")
  .max(160, "That name is too long");

/**
 * Reminder cadence in days, as a list of offsets from the due date. Negative is
 * before the due date, positive is after.
 *
 * This lives in Zod rather than a CHECK constraint: Postgres rejects a CHECK
 * containing a subquery, and an earlier attempt to range-check this in the
 * schema failed for that reason (see DECISIONS.md).
 */
export const reminderCadenceSchema = z
  .array(z.number().int().min(-60).max(60))
  .min(1, "Add at least one reminder")
  .max(6, "Six reminders is plenty — more reads as spam")
  .refine((days) => new Set(days).size === days.length, "Remove the duplicate reminder days");

export const createFirmSchema = z.object({
  name: firmName,
  /** IANA zone. IST is the default and the only one V1 promises to get right. */
  timezone: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
});

export const updateFirmSchema = z.object({
  name: firmName,
  reminderCadence: reminderCadenceSchema.optional(),
});

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email("Enter a valid email address"))
    .transform((v) => v.toLowerCase()),
  role: z.enum(ROLES),
});

export const updateMemberRoleSchema = z.object({
  membershipId: z.uuid(),
  role: z.enum(ROLES),
});

export type CreateFirmInput = z.infer<typeof createFirmSchema>;
export type UpdateFirmInput = z.infer<typeof updateFirmSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
