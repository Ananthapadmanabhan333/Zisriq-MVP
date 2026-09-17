import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/auth/session";
import { RequestForm, type TemplateOption } from "./request-form";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequestPage({ searchParams }: PageProps<"/requests/new">) {
  const session = await requireSession();
  if (!can(session.role, "request.create")) redirect("/requests");

  const params = await searchParams;
  const defaultClientId = typeof params.clientId === "string" ? params.clientId : undefined;

  const supabase = await createClient();

  const [{ data: clients }, { data: templates }, { data: members }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("checklist_templates")
      .select("id, name, checklist_template_items(label, description, is_mandatory, sort_order)")
      .eq("is_archived", false)
      .order("name"),
    supabase.from("memberships").select("user_id, profiles(full_name, email)"),
  ]);

  if ((clients ?? []).length === 0) {
    return (
      <main className="flex-1 space-y-6 px-8 pb-8">
        <PageHeader title="New request" />
        <div className="bg-card ring-border/60 rounded-2xl p-10 text-center ring-1">
          <p className="text-[15px] font-medium">Add a client first</p>
          <p className="text-muted-foreground mt-2 text-sm">
            A request is always addressed to one client.
          </p>
          <Link
            href="/clients/new"
            className="text-primary mt-4 inline-block font-medium hover:underline"
          >
            Add a client
          </Link>
        </div>
      </main>
    );
  }

  const templateOptions: TemplateOption[] = (templates ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    items: [...(template.checklist_template_items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        label: item.label,
        description: item.description ?? "",
        isMandatory: item.is_mandatory,
      })),
  }));

  const memberOptions = (members ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return { id: m.user_id, name: profile?.full_name?.trim() || (profile?.email ?? "Member") };
  });

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader title="New request" description="One checklist, one client, one period." />
      <div className="bg-card ring-border/60 max-w-[820px] rounded-2xl p-6 ring-1">
        <RequestForm
          clients={clients ?? []}
          templates={templateOptions}
          members={memberOptions}
          defaultClientId={defaultClientId}
        />
      </div>
    </main>
  );
}
