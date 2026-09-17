"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { assertCan, PermissionError } from "@/lib/permissions";
import { serverEnv } from "@/server/env";
import { requireSession } from "@/server/auth/session";
import { issuePortalToken } from "@/server/services/portal-tokens";
import { fail, ok, type ActionResult } from "./types";

export type IssuedLink = { url: string; expiresAt: string };

/**
 * Mints an upload link for a request and returns it once.
 *
 * The request is read through the RLS client first. That read is the
 * authorisation check: if the caller cannot see the request, they cannot mint a
 * link for it. Only after it succeeds does the service role write the token row,
 * and it is handed only ids that this check already validated.
 */
export async function issueRequestPortalLink(requestId: string): Promise<ActionResult<IssuedLink>> {
  const session = await requireSession();

  try {
    assertCan(session.role, "request.update");
  } catch (error) {
    if (error instanceof PermissionError) {
      return fail("You do not have permission to send this request.");
    }
    throw error;
  }

  const supabase = await createClient();

  const { data: request } = await supabase
    .from("requests")
    .select("id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) return fail("That request could not be found.");

  if (request.status === "cancelled" || request.status === "completed") {
    return fail("This request is closed. Create a new one to collect more documents.");
  }

  const { data: firm } = await supabase
    .from("firms")
    .select("portal_token_ttl_days")
    .eq("id", session.firmId)
    .single();

  const { token, expiresAt } = await issuePortalToken({
    firmId: session.firmId,
    requestId,
    createdBy: session.userId,
    ttlDays: firm?.portal_token_ttl_days ?? 30,
  });

  // Sending the request is what moves it out of draft. Do it here rather than
  // making the user remember a second click.
  if (request.status === "requested") {
    await supabase
      .from("requests")
      .update({ status: "awaiting_client", sent_at: new Date().toISOString() })
      .eq("id", requestId);
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/dashboard");

  return ok({ url: `${serverEnv.APP_URL}/p/${token}`, expiresAt });
}
