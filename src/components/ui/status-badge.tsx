import { cn } from "@/lib/utils";
import { STATUS_LABELS, type Status } from "@/lib/status";

/**
 * A status always renders the same colour, from the tokens in globals.css.
 *
 * `overdue` is passed separately rather than being a status value, because it is
 * derived from the due date and can coexist with `awaiting_client`. See D-020.
 */
const toneFor: Record<Status, string> = {
  requested: "bg-secondary text-muted-foreground ring-border",
  awaiting_client: "bg-awaiting/15 text-awaiting ring-awaiting/25",
  received: "bg-chart-5/20 text-foreground ring-border",
  under_review: "bg-review/20 text-muted-foreground ring-border",
  completed: "bg-received/15 text-received ring-received/25",
  cancelled: "bg-secondary text-muted-foreground ring-border line-through",
};

export function StatusBadge({
  status,
  overdue = false,
  className,
}: {
  status: Status;
  overdue?: boolean;
  className?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1",
          toneFor[status],
          className,
        )}
      >
        {STATUS_LABELS[status]}
      </span>
      {overdue ? (
        <span className="bg-overdue/15 text-overdue ring-overdue/25 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1">
          Overdue
        </span>
      ) : null}
    </span>
  );
}
