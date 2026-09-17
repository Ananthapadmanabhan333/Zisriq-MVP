import type { Metadata } from "next";
import Link from "next/link";
import { CircleDot, Plus } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { describeDueDate, todayIst } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { isOverdue, type Status } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Requests" };

export default async function RequestsPage() {
  const session = await requireSession();
  const supabase = await createClient();

  // Staff see only what is assigned to them. That narrowing is an RLS policy,
  // not a filter here — which is why this query is identical for every role.
  const { data: requests } = await supabase
    .from("requests")
    .select("id, title, period_label, status, due_date, clients(name), request_items(status)")
    .order("due_date", { ascending: true, nullsFirst: false });

  const rows = requests ?? [];
  const today = todayIst();

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title="Requests"
        description={
          session.role === "staff"
            ? "Requests assigned to you."
            : `${rows.length} ${rows.length === 1 ? "request" : "requests"} across the firm.`
        }
        action={
          can(session.role, "request.create") ? (
            <ButtonLink href="/requests/new">
              <Plus className="size-4" aria-hidden />
              New request
            </ButtonLink>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={CircleDot}
          title={session.role === "staff" ? "Nothing assigned to you" : "No requests yet"}
          description={
            session.role === "staff"
              ? "When a colleague assigns you a request, it will appear here."
              : "A request is one checklist, sent to one client, for one period."
          }
          action={
            can(session.role, "request.create") ? (
              <ButtonLink href="/requests/new">
                <Plus className="size-4" aria-hidden />
                New request
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((request) => {
            const client = Array.isArray(request.clients) ? request.clients[0] : request.clients;
            const items = request.request_items ?? [];
            const collected = items.filter(
              (i) => i.status !== "requested" && i.status !== "awaiting_client",
            ).length;
            const overdue = isOverdue({
              status: request.status as Status,
              dueDate: request.due_date,
              todayIst: today,
            });
            const due = describeDueDate(request.due_date, today);

            return (
              <li
                key={request.id}
                className="bg-card ring-border/60 flex items-center gap-5 rounded-2xl p-5 ring-1"
              >
                <div className="min-w-0 flex-1">
                  <Link href={`/requests/${request.id}`} className="font-medium hover:underline">
                    {request.title}
                  </Link>
                  <p className="text-muted-foreground mt-1 text-[13px]">
                    {client?.name ?? "Unknown client"} · {request.period_label}
                  </p>
                </div>

                <p className="text-muted-foreground w-24 shrink-0 text-[13px] tabular-nums">
                  {collected} / {items.length}
                </p>

                <p
                  className={`w-36 shrink-0 text-[13px] ${overdue ? "text-overdue font-medium" : "text-muted-foreground"}`}
                >
                  {due.label}
                </p>

                <StatusBadge status={request.status as Status} overdue={overdue} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
