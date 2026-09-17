import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type ActivityEntry = {
  id: string;
  icon: LucideIcon;
  /** Rendered as: {subject} {verb} {object}. Subject and object are emphasised. */
  subject: string;
  verb: string;
  object?: string;
  timeAgo: string;
};

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className="bg-card ring-border/60 rounded-2xl p-5 ring-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <Link
          href="/activity"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
        >
          View all
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-5 space-y-5">
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <li key={entry.id} className="flex gap-3.5">
              <span
                className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-full"
                aria-hidden
              >
                <Icon className="text-muted-foreground size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-snug">
                  <span className="font-medium">{entry.subject}</span>{" "}
                  <span className="text-muted-foreground">{entry.verb}</span>
                  {entry.object ? <span className="font-medium"> {entry.object}</span> : null}
                </p>
                <p className="text-muted-foreground mt-1.5 text-[13px]">{entry.timeAgo}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
