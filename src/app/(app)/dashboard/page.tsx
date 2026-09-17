import type { Metadata } from "next";
import {
  CircleAlert,
  CircleCheck,
  CirclePlus,
  Clock,
  FileText,
  Mail,
  Upload,
  UserCheck,
} from "lucide-react";

import { ActivityFeed, type ActivityEntry } from "@/components/dashboard/activity-feed";
import { AttentionList } from "@/components/dashboard/attention-list";
import { ClientsCard } from "@/components/dashboard/clients-card";
import {
  CollectionProgress,
  type ProgressSegment,
} from "@/components/dashboard/collection-progress";
import { GreetingBanner } from "@/components/dashboard/greeting-banner";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatIstDateLong, istGreeting } from "@/lib/dates";
import { requireSession } from "@/server/auth/session";
import { getDashboard, statusSegments, type ActivityItem } from "@/server/services/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

/** Rotates daily so it does not feel like a fixed banner, but never mid-session. */
const QUOTES = [
  "Small steps, completed on time, create big trust.",
  "The file you chase today is the deadline you keep next week.",
  "Clients remember how easy you made it.",
  "A clear checklist beats a long reminder.",
];

/** Maps a stored verb onto an icon and readable phrasing. */
function describeActivity(item: ActivityItem): ActivityEntry {
  const icons = {
    "document.uploaded": Upload,
    "reminder.sent": Mail,
    "request.status_changed": UserCheck,
    "request.created": CirclePlus,
    "firm.created": CirclePlus,
  } as const;

  const icon = icons[item.verb as keyof typeof icons] ?? CirclePlus;
  const subject = item.actorName ?? "Someone";
  const readable = item.verb.split(".").at(-1)?.replace(/_/g, " ") ?? item.verb;

  return {
    id: item.id,
    icon,
    subject,
    verb: readable,
    object: typeof item.metadata.label === "string" ? item.metadata.label : undefined,
    timeAgo: item.timeAgo,
  };
}

export default async function DashboardPage() {
  const session = await requireSession();
  const { stats, attention, activity, clients } = await getDashboard(session);

  const firstName = (session.fullName?.trim() || session.email).split(/[\s@]/)[0];
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  const segments: ProgressSegment[] = statusSegments(stats).map((segment) => ({
    label: segment.label,
    count: segment.count,
    color: segment.colorVar,
    subset: segment.subset,
  }));

  return (
    <main className="grid flex-1 grid-cols-1 gap-5 px-8 pb-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        <GreetingBanner
          dateLabel={formatIstDateLong()}
          greeting={istGreeting()}
          firstName={firstName}
          attentionCount={stats.overdue}
          quote={quote}
        />

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <StatCard label="Total Requests" value={stats.total} icon={FileText} />
          <StatCard
            label="Awaiting Client"
            value={stats.awaitingClient}
            icon={Clock}
            tone="awaiting"
          />
          <StatCard label="Overdue" value={stats.overdue} icon={CircleAlert} tone="overdue" />
          <StatCard label="Completed" value={stats.completed} icon={CircleCheck} tone="received" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <CollectionProgress
            percent={stats.collectedPercent}
            segments={segments}
            periodLabel="All time"
          />
          <ClientsCard
            activeCount={clients.active}
            addedThisMonth={clients.addedThisMonth}
            trend={[3, 6, 4, Math.max(clients.addedThisMonth, 1)]}
          />
        </div>

        {attention.length > 0 ? (
          <AttentionList rows={attention} />
        ) : (
          <section className="bg-card ring-border/60 rounded-2xl p-10 text-center ring-1">
            <p className="text-[15px] font-medium">Nothing needs chasing</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Every request with a due date is either on track or finished.
            </p>
          </section>
        )}
      </div>

      <div className="space-y-5">
        <QuickActions />
        {activity.length > 0 ? (
          <ActivityFeed entries={activity.map(describeActivity)} />
        ) : (
          <section className="bg-card ring-border/60 rounded-2xl p-6 ring-1">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <p className="text-muted-foreground mt-3 text-sm">
              Activity appears here as you create clients and send requests.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
