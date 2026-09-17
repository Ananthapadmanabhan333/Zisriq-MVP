import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/server/db/admin";

/**
 * Secure upload links for clients, who never have an account.
 *
 * The token is the only credential a client presents, so it is treated like a
 * password:
 *
 *   - 32 random bytes from a CSPRNG, base64url encoded. Guessing is not feasible.
 *   - Only the SHA-256 hash is stored. A leaked database dump does not yield
 *     working links, and nobody at the firm can read a client's link out of the
 *     table.
 *   - It is returned to the caller exactly once, at creation. There is no
 *     "show link again" — reissuing mints a new token, which is also what makes
 *     revocation meaningful.
 *
 * Hashing is plain SHA-256 rather than a slow KDF on purpose: the token is 256
 * bits of uniform randomness, so there is no dictionary to attack and stretching
 * would only add latency to every portal page load.
 */

const TOKEN_BYTES = 32;

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

/** Constant-time compare, so a lookup cannot be turned into an oracle. */
export function tokensMatch(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export type IssuedToken = {
  /** Plaintext. Show once, never persist, never log. */
  token: string;
  expiresAt: string;
};

/**
 * Issues a link for a request and revokes any previous live ones.
 *
 * Old links are revoked because a client who was sent two links will use
 * whichever they find first, and a firm that "reissues because the last one
 * leaked" would otherwise leave the leaked one working.
 */
export async function issuePortalToken(params: {
  firmId: string;
  requestId: string;
  createdBy: string;
  ttlDays: number;
}): Promise<IssuedToken> {
  const admin = createAdminClient();

  await admin
    .from("portal_tokens")
    .update({ revoked_at: new Date().toISOString(), revoked_by: params.createdBy })
    .eq("request_id", params.requestId)
    .is("revoked_at", null);

  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + params.ttlDays * 86_400_000).toISOString();

  const { error } = await admin.from("portal_tokens").insert({
    firm_id: params.firmId,
    request_id: params.requestId,
    // bytea over PostgREST goes as a hex-escaped string.
    token_hash: `\\x${hashToken(token).toString("hex")}`,
    expires_at: expiresAt,
    created_by: params.createdBy,
  });

  if (error) throw error;

  return { token, expiresAt };
}

export type PortalScope = {
  tokenId: string;
  firmId: string;
  requestId: string;
};

/**
 * Exchanges a plaintext token for the single request it grants access to.
 *
 * Uses the admin client because the caller has no Supabase session at all — the
 * token IS the authentication. Everything it returns is scoped to one request,
 * and callers must never widen it.
 *
 * Returns null for expired, revoked and unknown tokens alike: distinguishing
 * them tells an attacker whether a guess was ever a real link.
 */
export async function resolvePortalToken(token: string): Promise<PortalScope | null> {
  if (!token || token.length < 20) return null;

  const admin = createAdminClient();
  const hex = `\\x${hashToken(token).toString("hex")}`;

  const { data, error } = await admin
    .from("portal_tokens")
    .select("id, firm_id, request_id, expires_at, revoked_at")
    .eq("token_hash", hex)
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  return { tokenId: data.id, firmId: data.firm_id, requestId: data.request_id };
}

/** Records use for the audit trail. Best effort: never block a client upload. */
export async function touchPortalToken(tokenId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("touch_portal_token", { p_token_id: tokenId });
}
