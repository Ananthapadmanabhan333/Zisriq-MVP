import type { Metadata } from "next";
import { History } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { timeAgo } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Activity" };

/** Verbs are stored as `noun.past_tense`; render them as readable English. */
function readable(verb: string): string {
  return verb.split(".").at(-1)?.replace(/_/g, " ") ?? verb;
}

export default async function ActivityPage() {
  await requireSession();
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("activity_events")
    .select("id, verb, target_type, metadata, created_at, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = events ?? [];

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title="Activity"
        description="An append-only record of what happened, and who did it."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nothing has happened yet"
          description="Creating clients, sending requests and client uploads all appear here."
        />
      ) : (
        <ul className="bg-card ring-border/60 divide-border/60 divide-y overflow-hidden rounded-2xl ring-1">
          {rows.map((event) => {
            const actor = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles;
            const metadata = (event.metadata ?? {}) as Record<string, unknown>;
            const label = typeof metadata.label === "string" ? metadata.label : null;

            return (
              <li key={event.id} className="flex items-baseline gap-4 px-6 py-4">
                <span className="min-w-0 flex-1 text-[15px]">
                  <span className="font-medium">
                    {actor?.full_name?.trim() || actor?.email || "Zisriq"}
                  </span>{" "}
                  <span className="text-muted-foreground">{readable(event.verb)}</span>
                  {label ? <span className="font-medium"> {label}</span> : null}
                  <span className="text-muted-foreground"> · {event.target_type}</span>
                </span>
                <span className="text-muted-foreground shrink-0 text-[13px]">
                  {timeAgo(event.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
