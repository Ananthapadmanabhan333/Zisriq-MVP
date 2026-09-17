import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Maps to the status palette in globals.css, so a colour always means the
    same thing wherever it appears. */
export type StatTone = "neutral" | "awaiting" | "overdue" | "received";

const toneStyles: Record<StatTone, { icon: string; wash: string }> = {
  neutral: { icon: "bg-secondary text-foreground", wash: "" },
  awaiting: { icon: "bg-awaiting/15 text-awaiting", wash: "from-awaiting/[0.07]" },
  overdue: { icon: "bg-overdue/15 text-overdue", wash: "from-overdue/[0.09]" },
  received: { icon: "bg-received/15 text-received", wash: "from-received/[0.07]" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  delta,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: StatTone;
  delta?: {
    /** Signed change, e.g. 12 or -8. The arrow follows the sign. */
    percent: number;
    caption: string;
    /** Whether a rise is good news. Overdue going up is not. */
    riseIsGood: boolean;
  };
}) {
  const styles = toneStyles[tone];
  const rising = delta ? delta.percent >= 0 : false;
  const DeltaArrow = rising ? ArrowUpRight : ArrowDownRight;
  const deltaIsGood = delta ? rising === delta.riseIsGood : true;

  return (
    <div
      className={cn(
        "bg-card ring-border/60 relative overflow-hidden rounded-2xl p-5 ring-1",
        styles.wash && "bg-gradient-to-br to-transparent",
        styles.wash,
      )}
    >
      <span
        className={cn("flex size-11 items-center justify-center rounded-full", styles.icon)}
        aria-hidden
      >
        <Icon className="size-5" />
      </span>

      <p className="mt-5 text-[34px] leading-none font-semibold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-2.5 text-[15px]">{label}</p>

      {delta ? (
        <p className="mt-4 flex items-center gap-1 text-xs whitespace-nowrap">
          <DeltaArrow
            className={cn("size-3.5", deltaIsGood ? "text-received" : "text-overdue")}
            aria-hidden
          />
          <span className={cn("font-medium", deltaIsGood ? "text-received" : "text-overdue")}>
            {Math.abs(delta.percent)}%
          </span>
          <span className="text-muted-foreground min-w-0 truncate">{delta.caption}</span>
        </p>
      ) : null}
    </div>
  );
}
