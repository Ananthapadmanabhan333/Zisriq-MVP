"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { formFields } from "@/lib/forms";
import { assertCan, PermissionError, type Role } from "@/lib/permissions";
import { inviteMemberSchema, updateMemberRoleSchema } from "@/lib/validation/firm";
import { serverEnv } from "@/server/env";
import { requireSession } from "@/server/auth/session";
import { createInvite } from "@/server/services/invites";
import { sendEmail } from "@/server/services/email";
import { fail, fromZodError, ok, type ActionResult } from "./types";

export type InviteIssued = { url: string; expiresAt: string; emailed: boolean };

export async function inviteMember(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<InviteIssued>> {
  const session = await requireSession();

  try {
    assertCan(session.role, "member.invite");
  } catch (error) {
    if (error instanceof PermissionError) return fail("Only an admin can invite members.");
    throw error;
  }

  const parsed = inviteMemberSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();

  // Already a member? Inviting them again would create a link they cannot use.
  const { data: existing } = await supabase
    .from("memberships")
    .select("id, profiles!inner(email)")
    .eq("profiles.email", parsed.data.email)
    .maybeSingle();

  if (existing) return fail("That person is already in your firm.");

  const { token, expiresAt } = await createInvite({
    firmId: session.firmId,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedBy: session.userId,
  });

  const url = `${serverEnv.APP_URL}/invite/${token}`;

  // Email it when a provider is configured; either way the link comes back so
  // an admin can send it themselves. A silent failure here would leave the
  // invitee waiting for a message that never arrives.
  const sendResult = await sendEmail({
    to: parsed.data.email,
    subject: `${session.firmName} invited you to Zisriq`,
    text: [
      `${session.fullName ?? session.email} has invited you to join ${session.firmName} on Zisriq.`,
      "",
      url,
      "",
      "This invitation expires in 7 days.",
    ].join("\n"),
    html: `<p>${session.fullName ?? session.email} has invited you to join <strong>${session.firmName}</strong> on Zisriq.</p><p><a href="${url}">Accept the invitation</a></p><p>This invitation expires in 7 days.</p>`,
  });

  revalidatePath("/members");
  return ok({ url, expiresAt, emailed: sendResult.ok });
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "member.invite");
  } catch (error) {
    if (error instanceof PermissionError) return fail("Only an admin can manage invites.");
    throw error;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invites").delete().eq("id", inviteId);
  if (error) return fail(error.message);

  revalidatePath("/members");
  return ok();
}

export async function updateMemberRole(membershipId: string, role: Role): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "member.updateRole");
  } catch (error) {
    if (error instanceof PermissionError) return fail("Only an admin can change roles.");
    throw error;
  }

  const parsed = updateMemberRoleSchema.safeParse({ membershipId, role });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("id", membershipId)
    .maybeSingle();

  if (!target) return fail("That member could not be found.");

  // A firm with no admin cannot invite anyone, change settings, or recover
  // without support. Demoting the last one is an easy accident with no undo.
  if (target.role === "admin" && parsed.data.role !== "admin") {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) <= 1) {
      return fail("This is the firm's only admin. Promote someone else first.");
    }
  }

  const { error } = await supabase
    .from("memberships")
    .update({ role: parsed.data.role })
    .eq("id", membershipId);

  if (error) return fail(error.message);

  revalidatePath("/members");
  return ok();
}

export async function removeMember(membershipId: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "member.remove");
  } catch (error) {
    if (error instanceof PermissionError) return fail("Only an admin can remove members.");
    throw error;
  }

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("id", membershipId)
    .maybeSingle();

  if (!target) return fail("That member could not be found.");

  // Removing yourself would drop you out of the firm mid-session, with no way
  // back in. If you mean to leave, an admin removes you.
  if (target.user_id === session.userId) {
    return fail("You cannot remove yourself.");
  }

  if (target.role === "admin") {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) <= 1) {
      return fail("This is the firm's only admin.");
    }
  }

  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) return fail(error.message);

  revalidatePath("/members");
  return ok();
}
