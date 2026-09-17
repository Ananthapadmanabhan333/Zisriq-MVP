import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { describeDueDate, todayIst } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { isOverdue, type Status } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/validation/client";
import { updateClientRecord } from "@/server/actions/clients";
import { requireSession } from "@/server/auth/session";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Client" };

export default async function ClientDetailPage({ params }: PageProps<"/clients/[clientId]">) {
  const { clientId } = await params;
  const session = await requireSession();
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, type, pan, gstin, contact_name, contact_email, contact_phone, notes, is_active",
    )
    .eq("id", clientId)
    .maybeSingle();

  // RLS makes another firm's client indistinguishable from a missing one, which
  // is exactly right: a 404 reveals nothing about whether the id exists.
  if (!client) notFound();

  const { data: requests } = await supabase
    .from("requests")
    .select("id, title, period_label, status, due_date")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const today = todayIst();
  const mayEdit = can(session.role, "client.update");

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title={client.name}
        description={`${CLIENT_TYPE_LABELS[client.type as ClientType]}${client.pan ? ` · ${client.pan}` : ""}`}
        action={
          can(session.role, "request.create") ? (
            <ButtonLink href={`/requests/new?clientId=${client.id}`}>
              <Plus className="size-4" aria-hidden />
              New request
            </ButtonLink>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Requests</h2>

          {(requests ?? []).length === 0 ? (
            <div className="bg-card ring-border/60 rounded-2xl p-8 text-center ring-1">
              <p className="text-[15px] font-medium">No requests yet</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Send this client a document checklist to get started.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {(requests ?? []).map((request) => {
                const overdue = isOverdue({
                  status: request.status as Status,
                  dueDate: request.due_date,
                  todayIst: today,
                });
                return (
                  <li
                    key={request.id}
                    className="bg-card ring-border/60 flex items-center gap-4 rounded-2xl p-4 ring-1"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/requests/${request.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {request.title}
                      </Link>
                      <p className="text-muted-foreground mt-1 text-[13px]">
                        {request.period_label} · {describeDueDate(request.due_date, today).label}
                      </p>
                    </div>
                    <StatusBadge status={request.status as Status} overdue={overdue} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Details</h2>
          <div className="bg-card ring-border/60 rounded-2xl p-6 ring-1">
            {mayEdit ? (
              <ClientForm
                action={updateClientRecord}
                submitLabel="Save changes"
                defaults={{
                  id: client.id,
                  name: client.name,
                  type: client.type,
                  pan: client.pan,
                  gstin: client.gstin,
                  contactName: client.contact_name,
                  contactEmail: client.contact_email,
                  contactPhone: client.contact_phone,
                  notes: client.notes,
                }}
              />
            ) : (
              <dl className="space-y-4 text-[15px]">
                <div>
                  <dt className="text-muted-foreground text-[13px]">Contact</dt>
                  <dd>{client.contact_email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-[13px]">GSTIN</dt>
                  <dd className="font-mono text-[13px]">{client.gstin ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-[13px]">Notes</dt>
                  <dd className="whitespace-pre-wrap">{client.notes ?? "—"}</dd>
                </div>
              </dl>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
