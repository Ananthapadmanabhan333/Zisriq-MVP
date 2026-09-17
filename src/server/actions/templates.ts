"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { assertCan, PermissionError } from "@/lib/permissions";
import { templateSchema } from "@/lib/validation/request";
import { requireSession } from "@/server/auth/session";
import { fail, fromZodError, ok, type ActionResult } from "./types";

/**
 * Items arrive as repeated form fields rather than JSON, so the form works
 * without JavaScript and so each row can carry its own validation error.
 */
function readItems(formData: FormData) {
  const labels = formData.getAll("itemLabel").map(String);
  const descriptions = formData.getAll("itemDescription").map(String);
  const mandatory = new Set(formData.getAll("itemMandatory").map(String));

  return labels
    .map((label, index) => ({
      label,
      description: descriptions[index] ?? "",
      // An unchecked checkbox submits nothing, so presence of the index is the signal.
      isMandatory: mandatory.has(String(index)),
    }))
    .filter((item) => item.label.trim().length > 0);
}

export async function createTemplate(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "template.manage");
  } catch (error) {
    if (error instanceof PermissionError) {
      return fail("You do not have permission to manage templates.");
    }
    throw error;
  }

  const parsed = templateSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    items: readItems(formData),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();

  const { data: template, error } = await supabase
    .from("checklist_templates")
    .insert({
      firm_id: session.firmId,
      name: parsed.data.name,
      description: parsed.data.description,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return fail("A template with that name already exists.");
    return fail(error.message);
  }

  const { error: itemsError } = await supabase.from("checklist_template_items").insert(
    parsed.data.items.map((item, index) => ({
      firm_id: session.firmId,
      template_id: template.id,
      label: item.label,
      description: item.description,
      is_mandatory: item.isMandatory,
      sort_order: index,
    })),
  );

  if (itemsError) {
    // A template with no items is useless and confusing; do not leave one behind.
    await supabase.from("checklist_templates").delete().eq("id", template.id);
    return fail(itemsError.message);
  }

  revalidatePath("/templates");
  redirect("/templates");
}

export async function archiveTemplate(templateId: string): Promise<ActionResult> {
  const session = await requireSession();

  try {
    assertCan(session.role, "template.manage");
  } catch (error) {
    if (error instanceof PermissionError) {
      return fail("You do not have permission to manage templates.");
    }
    throw error;
  }

  const supabase = await createClient();
  // Archived, not deleted: requests created from it reference its items, and the
  // firm may want to see what was asked for historically.
  const { error } = await supabase
    .from("checklist_templates")
    .update({ is_archived: true })
    .eq("id", templateId);

  if (error) return fail(error.message);

  revalidatePath("/templates");
  return ok();
}
