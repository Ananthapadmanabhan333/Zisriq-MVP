import "server-only";

import { randomBytes } from "node:crypto";

import { hashToken } from "./portal-tokens";
import { createAdminClient } from "@/server/db/admin";
import type { Role } from "@/lib/permissions";

/**
 * Team invites.
 *
 * Same shape as a portal token and for the same reason: the link is a credential,
 * so only its SHA-256 is stored and the plaintext is shown exactly once. An
 * invite is more sensitive than a portal link — it grants standing access to
 * every client in the firm rather than one request — so it expires sooner.
 */

const INVITE_TTL_DAYS = 7;

export type IssuedInvite = { token: string; expiresAt: string };

export async function createInvite(params: {
  firmId: string;
  email: string;
  role: Role;
  invitedBy: string;
}): Promise<IssuedInvite> {
  const admin = createAdminClient();

  // Re-inviting supersedes any outstanding invite for the same address, so a
  // single address never has two live links with possibly different roles.
  await admin
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("firm_id", params.firmId)
    .eq("email", params.email)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();

  const { error } = await admin.from("invites").insert({
    firm_id: params.firmId,
    email: params.email,
    role: params.role,
    token_hash: `\\x${hashToken(token).toString("hex")}`,
    expires_at: expiresAt,
    invited_by: params.invitedBy,
  });

  if (error) throw error;

  return { token, expiresAt };
}

export type ResolvedInvite = {
  id: string;
  firmId: string;
  firmName: string;
  email: string;
  role: Role;
};

/** Null for unknown, expired, revoked and already-accepted alike. */
export async function resolveInvite(token: string): Promise<ResolvedInvite | null> {
  if (!token || token.length < 20) return null;

  const admin = createAdminClient();

  const { data } = await admin
    .from("invites")
    .select("id, firm_id, email, role, expires_at, accepted_at, revoked_at, firms(name)")
    .eq("token_hash", `\\x${hashToken(token).toString("hex")}`)
    .maybeSingle();

  if (!data) return null;
  if (data.accepted_at || data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  const firm = Array.isArray(data.firms) ? data.firms[0] : data.firms;

  return {
    id: data.id,
    firmId: data.firm_id,
    firmName: firm?.name ?? "a firm",
    email: data.email,
    role: data.role as Role,
  };
}

/**
 * Turns an invite into a membership for an already-signed-in user.
 *
 * The signed-in email must match the invited one. Without that check, anyone who
 * obtained the link could join the firm under someone else's invitation — the
 * link would become a bearer token for firm access rather than an invitation to
 * a specific person.
 */
export async function acceptInvite(params: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<{ ok: true; firmId: string } | { ok: false; reason: string }> {
  const invite = await resolveInvite(params.token);
  if (!invite) return { ok: false, reason: "That invitation is no longer valid." };

  if (invite.email.toLowerCase() !== params.userEmail.toLowerCase()) {
    return {
      ok: false,
      reason: `That invitation was sent to ${invite.email}. Sign in with that address to accept it.`,
    };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", params.userId)
    .maybeSingle();

  // V1 is one firm per user, and getSession() picks a single membership. A
  // second would be invisible and confusing rather than useful.
  if (existing) {
    return { ok: false, reason: "You already belong to a firm." };
  }

  const { error } = await admin.from("memberships").insert({
    firm_id: invite.firmId,
    user_id: params.userId,
    role: invite.role,
  });

  if (error) return { ok: false, reason: "That invitation could not be accepted." };

  await admin.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  await admin.from("activity_events").insert({
    firm_id: invite.firmId,
    actor_user_id: params.userId,
    verb: "member.joined",
    target_type: "membership",
    metadata: { label: params.userEmail, role: invite.role },
  });

  return { ok: true, firmId: invite.firmId };
}
