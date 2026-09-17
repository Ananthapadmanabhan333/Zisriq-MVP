import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, FileText } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { describeDueDate, formatIstDate, todayIst } from "@/lib/dates";
import { isOverdue, STATUS_LABELS, type Status } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/auth/session";
import { PortalLinkPanel } from "./portal-link-panel";
import { StatusActions } from "./status-actions";

export const metadata: Metadata = { title: "Request" };

export default async function RequestDetailPage({ params }: PageProps<"/requests/[requestId]">) {
  const { requestId } = await params;
  await requireSession();
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("requests")
    .select(
      `id, title, period_label, status, due_date, sent_at,
       clients(id, name, contact_email),
       profiles(full_name),
       request_items(id, label, description, is_mandatory, status, sort_order,
                     documents(id, original_filename, size_bytes, review_status))`,
    )
    .eq("id", requestId)
    .maybeSingle();

  // RLS makes another firm's request indistinguishable from a missing one. That
  // is the point: a 404 reveals nothing about whether the id exists.
  if (!request) notFound();

  const client = Array.isArray(request.clients) ? request.clients[0] : request.clients;
  const assignee = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;

  const today = todayIst();
  const status = request.status as Status;
  const overdue = isOverdue({ status, dueDate: request.due_date, todayIst: today });

  const items = [...(request.request_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const collected = items.filter((item) => (item.documents ?? []).length > 0).length;

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title={request.title}
        description={
          <>
            {client ? (
              <Link href={`/clients/${client.id}`} className="hover:underline">
                {client.name}
              </Link>
            ) : (
              "Unknown client"
            )}
            {` · ${request.period_label}`}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Documents{" "}
            <span className="text-muted-foreground font-normal">
              — {collected} of {items.length} received
            </span>
          </h2>

          <ul className="space-y-3">
            {items.map((item) => {
              const documents = item.documents ?? [];
              const received = documents.length > 0;

              return (
                <li key={item.id} className="bg-card ring-border/60 rounded-2xl p-5 ring-1">
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 shrink-0" aria-hidden>
                      {received ? (
                        <CheckCircle2 className="text-received size-5" />
                      ) : (
                        <Circle className="text-muted-foreground size-5" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {item.label}
                        {!item.is_mandatory ? (
                          <span className="text-muted-foreground ml-2 text-[13px] font-normal">
                            optional
                          </span>
                        ) : null}
                      </p>
                      {item.description ? (
                        <p className="text-muted-foreground mt-1 text-[13px]">{item.description}</p>
                      ) : null}

                      {documents.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {documents.map((doc) => (
                            <li
                              key={doc.id}
                              className="bg-surface-raised/60 ring-border/50 flex items-center gap-3 rounded-xl px-3 py-2 ring-1"
                            >
                              <FileText
                                className="text-muted-foreground size-4 shrink-0"
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 truncate text-[13px]">
                                {doc.original_filename}
                              </span>
                              <span className="text-muted-foreground shrink-0 text-[12px] tabular-nums">
                                {Math.round(doc.size_bytes / 1024)} KB
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <span className="text-muted-foreground shrink-0 text-[13px]">
                      {STATUS_LABELS[item.status as Status]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="space-y-5">
          <div className="bg-card ring-border/60 space-y-4 rounded-2xl p-5 ring-1">
            <div>
              <p className="text-muted-foreground text-[13px]">Status</p>
              <div className="mt-2">
                <StatusBadge status={status} overdue={overdue} />
              </div>
            </div>

            <dl className="space-y-3">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground text-[13px]">Due</dt>
                <dd className={overdue ? "text-overdue text-[13px] font-medium" : "text-[13px]"}>
                  {describeDueDate(request.due_date, today).label}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground text-[13px]">Assigned to</dt>
                <dd className="text-[13px]">{assignee?.full_name?.trim() || "Unassigned"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground text-[13px]">Sent</dt>
                <dd className="text-[13px]">
                  {request.sent_at ? formatIstDate(new Date(request.sent_at)) : "Not yet"}
                </dd>
              </div>
            </dl>

            <div className="border-border/60 border-t pt-4">
              <StatusActions requestId={request.id} status={status} />
            </div>
          </div>

          <PortalLinkPanel requestId={request.id} clientEmail={client?.contact_email ?? null} />
        </aside>
      </div>
    </main>
  );
}
