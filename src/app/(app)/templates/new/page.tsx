import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { requireSession } from "@/server/auth/session";
import { TemplateForm } from "./template-form";

export const metadata: Metadata = { title: "New template" };

export default async function NewTemplatePage() {
  const session = await requireSession();
  if (!can(session.role, "template.manage")) redirect("/templates");

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title="New template"
        description="List the documents you ask for. You can adjust them per request later."
      />
      <div className="bg-card ring-border/60 max-w-[720px] rounded-2xl p-6 ring-1">
        <TemplateForm />
      </div>
    </main>
  );
}
