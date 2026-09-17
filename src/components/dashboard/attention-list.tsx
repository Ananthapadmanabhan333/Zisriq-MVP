import Link from "next/link";
import { CalendarDays, ChevronRight, FileText, User } from "lucide-react";

import { cn } from "@/lib/utils";

/** How close a request is to its due date. Drives the left rail colour and the
    wording, so urgency reads identically everywhere. */
export type Urgency = "overdue" | "due-today" | "due-soon";

const urgencyStyles: Record<Urgency, { rail: string; text: string }> = {
  overdue: { rail: "bg-overdue", text: "text-overdue" },
  "due-today": { rail: "bg-overdue/70", text: "text-primary" },
  "due-soon": { rail: "bg-primary", text: "text-primary" },
};

export type AttentionRow = {
  id: string;
  clientName: string;
  templateName: string;
  periodLabel: string;
  collected: number;
  total: number;
  dueLabel: string;
  urgency: Urgency;
};

export function AttentionList({ rows }: { rows: AttentionRow[] }) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Needs Your Attention</h2>
        <Link
          href="/requests"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
        >
          View all
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          const styles = urgencyStyles[row.urgency];
          const pct = row.total === 0 ? 0 : Math.round((row.collected / row.total) * 100);

          return (
            <li
              key={row.id}
              className="bg-card ring-border/60 relative flex items-center gap-5 overflow-hidden rounded-2xl py-4 pr-4 pl-6 ring-1"
            >
              <span className={cn("absolute inset-y-0 left-0 w-1.5", styles.rail)} aria-hidden />

              <span
                className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-full"
                aria-hidden
              >
                <User className="text-muted-foreground size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{row.clientName}</p>
                <p className="text-muted-foreground mt-1 truncate text-[13px]">
                  {row.templateName} · {row.periodLabel}
                </p>
              </div>

              <div className="w-[132px] shrink-0">
                <p className="text-muted-foreground flex items-center gap-2 text-[13px]">
                  <FileText className="size-4" aria-hidden />
                  <span className="text-foreground tabular-nums">
                    {row.collected} / {row.total}
                  </span>
                </p>
                <div
                  className="bg-secondary mt-2 h-1.5 w-full overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.collected} of ${row.total} documents collected`}
                >
                  <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <p
                className={cn(
                  "flex w-[140px] shrink-0 items-center gap-2 text-[13px] font-medium",
                  styles.text,
                )}
              >
                <CalendarDays className="size-4 shrink-0" aria-hidden />
                {row.dueLabel}
              </p>

              <Link
                href={`/requests/${row.id}`}
                className="bg-secondary hover:bg-surface-raised ring-border/60 flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition-colors"
              >
                View
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
