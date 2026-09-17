import type { Metadata } from "next";
import { CircleAlert, CircleCheck, Clock, FileText } from "lucide-react";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AttentionList } from "@/components/dashboard/attention-list";
import { ClientsCard } from "@/components/dashboard/clients-card";
import { CollectionProgress } from "@/components/dashboard/collection-progress";
import { GreetingBanner } from "@/components/dashboard/greeting-banner";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatCard } from "@/components/dashboard/stat-card";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopBar } from "@/components/shell/top-bar";
import {
  activityEntries,
  attentionRows,
  AWAITING_CLIENT,
  clientTrend,
  COLLECTED_PERCENT,
  COMPLETED,
  OVERDUE,
  progressSegments,
  TOTAL_REQUESTS,
} from "./sample-data";

export const metadata: Metadata = {
  title: "Dashboard (design reference)",
  robots: { index: false, follow: false },
};

/**
 * Static design reference for the firm dashboard.
 *
 * Renders entirely from `sample-data.ts` -- no Supabase, no auth, no server
 * actions. It exists to lock the visual language before any of it is wired, so
 * the components here are the real ones and get promoted into the authed shell
 * in Phase 2 (chrome) and Phase 5 (dashboard content).
 *
 * Delete this route once /dashboard is live.
 */
export default function DashboardDesignReference() {
  return (
    <div className="dark bg-background text-foreground flex min-h-screen">
      <AppSidebar
        activeHref="/dashboard"
        firmName="ACME & Co."
        userName="Anantha P."
        userRole="Admin"
        userInitials="AP"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar firmName="ACME & Co." userName="Anantha P." userInitials="AP" hasUnread />

        <main className="grid flex-1 grid-cols-1 gap-5 px-8 pb-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-5">
            <GreetingBanner
              dateLabel="Friday, 18 September 2026"
              greeting="Good morning"
              firstName="Anantha"
              attentionCount={OVERDUE}
              quote="Small steps, completed on time, create big trust."
            />

            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              <StatCard
                label="Total Requests"
                value={TOTAL_REQUESTS}
                icon={FileText}
                delta={{ percent: 12, caption: "from last month", riseIsGood: true }}
              />
              <StatCard
                label="Awaiting Client"
                value={AWAITING_CLIENT}
                icon={Clock}
                tone="awaiting"
                delta={{ percent: -8, caption: "from last month", riseIsGood: false }}
              />
              <StatCard
                label="Overdue"
                value={OVERDUE}
                icon={CircleAlert}
                tone="overdue"
                delta={{ percent: 27, caption: "from last month", riseIsGood: false }}
              />
              <StatCard
                label="Completed"
                value={COMPLETED}
                icon={CircleCheck}
                tone="received"
                delta={{ percent: 18, caption: "from last month", riseIsGood: true }}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <CollectionProgress
                percent={COLLECTED_PERCENT}
                segments={progressSegments}
                periodLabel="This month"
              />
              <ClientsCard activeCount={42} addedThisMonth={4} trend={clientTrend} />
            </div>

            <AttentionList rows={attentionRows} />
          </div>

          <div className="space-y-5">
            <QuickActions />
            <ActivityFeed entries={activityEntries} />
          </div>
        </main>
      </div>
    </div>
  );
}
