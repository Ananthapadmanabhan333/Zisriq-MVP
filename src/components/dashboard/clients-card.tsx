import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

export function ClientsCard({
  activeCount,
  addedThisMonth,
  /** Relative heights, most recent last. Purely indicative of trend. */
  trend,
}: {
  activeCount: number;
  addedThisMonth: number;
  trend: number[];
}) {
  const peak = Math.max(...trend, 1);

  return (
    <section className="bg-card ring-border/60 flex flex-col rounded-2xl p-6 ring-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="bg-secondary flex size-11 items-center justify-center rounded-full"
            aria-hidden
          >
            <Users className="text-muted-foreground size-5" />
          </span>
          <h2 className="text-lg font-semibold">Clients</h2>
        </div>
        <Link
          href="/clients"
          aria-label="View all clients"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>

      <div className="mt-auto flex items-end justify-between pt-8">
        <div>
          <p className="text-[34px] leading-none font-semibold tracking-tight">{activeCount}</p>
          <p className="text-muted-foreground mt-2.5 text-[15px]">Active clients</p>
          <p className="text-received mt-3 text-[13px] font-medium">
            +{addedThisMonth} <span className="text-muted-foreground font-normal">this month</span>
          </p>
        </div>

        <div className="flex h-14 items-end gap-2" aria-hidden>
          {trend.map((value, index) => (
            <span
              key={index}
              className="bg-secondary last:bg-primary/80 w-3.5 rounded-t-md"
              style={{ height: `${Math.max((value / peak) * 100, 12)}%` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
