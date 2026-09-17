"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formFields } from "@/lib/forms";
import { assertCan, PermissionError } from "@/lib/permissions";
import { clientSchema, updateClientSchema } from "@/lib/validation/client";
import { requireSession } from "@/server/auth/session";
import { fail, fromZodError, ok, type ActionResult } from "./types";

/**
 * `firm_id` is taken from the session, never from the form. A client-supplied
 * firm_id is the single most obvious way to attempt a cross-tenant write, and
 * while RLS would reject it anyway, not reading it at all removes the question.
 */
export async function createClientRecord(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "client.create");
  } catch (error) {
    if (error instanceof PermissionError) return fail("You do not have permission to add clients.");
    throw error;
  }

  const parsed = clientSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      firm_id: session.firmId,
      name: parsed.data.name,
      type: parsed.data.type,
      pan: parsed.data.pan,
      gstin: parsed.data.gstin,
      contact_name: parsed.data.contactName,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone,
      notes: parsed.data.notes,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) return fail(error.message);

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function updateClientRecord(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "client.update");
  } catch (error) {
    if (error instanceof PermissionError)
      return fail("You do not have permission to edit clients.");
    throw error;
  }

  const parsed = updateClientSchema.safeParse(formFields(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      pan: parsed.data.pan,
      gstin: parsed.data.gstin,
      contact_name: parsed.data.contactName,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone,
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.id);

  if (error) return fail(error.message);

  revalidatePath("/clients");
  revalidatePath(`/clients/${parsed.data.id}`);
  return ok();
}

/**
 * Archive rather than delete. A client's requests and documents are records of
 * work done, and `requests.client_id` is ON DELETE RESTRICT precisely so that
 * removing a client cannot quietly orphan them.
 */
export async function setClientActive(clientId: string, isActive: boolean): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "client.archive");
  } catch (error) {
    if (error instanceof PermissionError) {
      return fail("Only an admin can archive a client.");
    }
    throw error;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ is_active: isActive })
    .eq("id", clientId);

  if (error) return fail(error.message);

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return ok();
}
