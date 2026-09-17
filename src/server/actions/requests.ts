"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { assertCan, PermissionError } from "@/lib/permissions";
import { createRequestSchema } from "@/lib/validation/request";
import { assertTransition, IllegalTransitionError, type Status } from "@/lib/status";
import { requireSession } from "@/server/auth/session";
import { fail, fromZodError, ok, type ActionResult } from "./types";

function readItems(formData: FormData) {
  const labels = formData.getAll("itemLabel").map(String);
  const descriptions = formData.getAll("itemDescription").map(String);
  const mandatory = new Set(formData.getAll("itemMandatory").map(String));

  return labels
    .map((label, index) => ({
      label,
      description: descriptions[index] ?? "",
      isMandatory: mandatory.has(String(index)),
    }))
    .filter((item) => item.label.trim().length > 0);
}

export async function createRequest(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "request.create");
  } catch (error) {
    if (error instanceof PermissionError) {
      return fail("You do not have permission to create requests.");
    }
    throw error;
  }

  const parsed = createRequestSchema.safeParse({
    clientId: formData.get("clientId") ?? "",
    title: formData.get("title") ?? "",
    periodLabel: formData.get("periodLabel") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    assignedTo: formData.get("assignedTo") ?? "",
    templateId: formData.get("templateId") ?? "",
    items: readItems(formData),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();

  // Items come either from a template or typed in directly. A request with no
  // items would be sent to a client asking for nothing.
  let items = parsed.data.items;
  if (items.length === 0 && parsed.data.templateId) {
    const { data: templateItems, error } = await supabase
      .from("checklist_template_items")
      .select("label, description, is_mandatory, sort_order")
      .eq("template_id", parsed.data.templateId)
      .order("sort_order", { ascending: true });

    if (error) return fail(error.message);
    items = (templateItems ?? []).map((i) => ({
      label: i.label,
      description: i.description,
      isMandatory: i.is_mandatory,
    }));
  }

  if (items.length === 0) {
    return fail("Add at least one document, or pick a template.", {
      items: ["A request with no items asks the client for nothing."],
    });
  }

  const { data: request, error } = await supabase
    .from("requests")
    .insert({
      firm_id: session.firmId,
      client_id: parsed.data.clientId,
      title: parsed.data.title,
      period_label: parsed.data.periodLabel,
      due_date: parsed.data.dueDate,
      assigned_to: parsed.data.assignedTo,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) return fail(error.message);

  const { error: itemsError } = await supabase.from("request_items").insert(
    items.map((item, index) => ({
      firm_id: session.firmId,
      request_id: request.id,
      label: item.label,
      description: item.description,
      is_mandatory: item.isMandatory,
      sort_order: index,
    })),
  );

  if (itemsError) {
    await supabase.from("requests").delete().eq("id", request.id);
    return fail(itemsError.message);
  }

  revalidatePath("/requests");
  redirect(`/requests/${request.id}`);
}

/**
 * Moves a request's status.
 *
 * The transition table is checked here so the user gets a readable message, and
 * again by a database trigger, which is what actually guarantees it. The two are
 * kept in agreement by tests/integration/status-transitions.
 */
export async function changeRequestStatus(requestId: string, to: Status): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "request.update");
  } catch (error) {
    if (error instanceof PermissionError) {
      return fail("You do not have permission to change this request.");
    }
    throw error;
  }

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .single();

  // RLS makes an out-of-scope request indistinguishable from a missing one,
  // which is the correct behaviour — do not confirm that it exists.
  if (readError || !current) return fail("That request could not be found.");

  try {
    assertTransition(current.status as Status, to);
  } catch (error) {
    if (error instanceof IllegalTransitionError) {
      return fail(`A request that is "${error.from}" cannot move straight to "${error.to}".`);
    }
    throw error;
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("requests")
    .update({
      status: to,
      ...(to === "awaiting_client" ? { sent_at: now } : {}),
      ...(to === "completed" ? { completed_at: now } : {}),
      ...(to === "cancelled" ? { cancelled_at: now } : {}),
    })
    .eq("id", requestId);

  if (error) return fail(error.message);

  revalidatePath("/requests");
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/dashboard");
  return ok();
}

export async function assignRequest(
  requestId: string,
  assignedTo: string | null,
): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "request.assign");
  } catch (error) {
    if (error instanceof PermissionError) {
      return fail("You do not have permission to reassign requests.");
    }
    throw error;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("requests")
    .update({ assigned_to: assignedTo })
    .eq("id", requestId);

  if (error) return fail(error.message);

  revalidatePath(`/requests/${requestId}`);
  return ok();
}
