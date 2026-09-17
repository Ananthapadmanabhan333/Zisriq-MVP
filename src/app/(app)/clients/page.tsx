import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/validation/client";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await requireSession();
  const supabase = await createClient();

  // No firm_id filter: RLS already scopes this to the caller's firm. Adding one
  // here would duplicate the rule in a second place that can drift.
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, type, pan, gstin, contact_email, is_active, requests(id)")
    .order("name", { ascending: true });

  const rows = clients ?? [];
  const mayCreate = can(session.role, "client.create");

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title="Clients"
        description={`${rows.length} ${rows.length === 1 ? "client" : "clients"} in ${session.firmName}.`}
        action={
          mayCreate ? (
            <ButtonLink href="/clients/new">
              <Plus className="size-4" aria-hidden />
              Add client
            </ButtonLink>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client, then send them a document request. They will not need an account."
          action={
            mayCreate ? (
              <ButtonLink href="/clients/new">
                <Plus className="size-4" aria-hidden />
                Add client
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <div className="bg-card ring-border/60 overflow-hidden rounded-2xl ring-1">
          <table className="w-full text-left">
            <thead className="text-muted-foreground border-border/60 border-b text-[13px]">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">
                  Name
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Type
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  PAN
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Contact
                </th>
                <th scope="col" className="px-6 py-4 text-right font-medium">
                  Requests
                </th>
              </tr>
            </thead>
            <tbody className="divide-border/60 divide-y">
              {rows.map((client) => (
                <tr key={client.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                      {client.name}
                    </Link>
                    {!client.is_active ? (
                      <span className="text-muted-foreground ml-2 text-xs">(archived)</span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground px-6 py-4 text-[15px]">
                    {CLIENT_TYPE_LABELS[client.type as ClientType]}
                  </td>
                  <td className="text-muted-foreground px-6 py-4 font-mono text-[13px]">
                    {client.pan ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-6 py-4 text-[15px]">
                    {client.contact_email ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums">
                    {(client.requests ?? []).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
