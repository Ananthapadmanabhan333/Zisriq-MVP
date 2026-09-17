import type { Metadata } from "next";
import { FileText, Plus } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("id, name, description, checklist_template_items(id)")
    .eq("is_archived", false)
    .order("name", { ascending: true });

  const rows = templates ?? [];
  const mayManage = can(session.role, "template.manage");

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title="Templates"
        description="Reusable checklists. Pick one when creating a request instead of retyping it."
        action={
          mayManage ? (
            <ButtonLink href="/templates/new">
              <Plus className="size-4" aria-hidden />
              New template
            </ButtonLink>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Most firms ask the same clients for the same documents each period. A template turns that into one click."
          action={
            mayManage ? (
              <ButtonLink href="/templates/new">
                <Plus className="size-4" aria-hidden />
                New template
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((template) => (
            <li key={template.id} className="bg-card ring-border/60 rounded-2xl p-5 ring-1">
              <p className="font-medium">{template.name}</p>
              {template.description ? (
                <p className="text-muted-foreground mt-2 text-sm">{template.description}</p>
              ) : null}
              <p className="text-muted-foreground mt-4 text-[13px]">
                {(template.checklist_template_items ?? []).length} documents
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
