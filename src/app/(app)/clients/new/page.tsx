import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/permissions";
import { createClientRecord } from "@/server/actions/clients";
import { requireSession } from "@/server/auth/session";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Add client" };

export default async function NewClientPage() {
  const session = await requireSession();
  // Hiding the button is not the check; this is.
  if (!can(session.role, "client.create")) redirect("/clients");

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title="Add client"
        description="Only the name and type are required. The rest can follow later."
      />
      <div className="bg-card ring-border/60 max-w-[680px] rounded-2xl p-6 ring-1">
        <ClientForm action={createClientRecord} submitLabel="Add client" />
      </div>
    </main>
  );
}
