import "server-only";

import { createClient } from "@/lib/supabase/server";
import { todayIst, describeDueDate, timeAgo, type IstDate } from "@/lib/dates";
import { isOverdue, type Status } from "@/lib/status";
import type { Session } from "@/server/auth/session";

/**
 * Everything the dashboard renders, in one round trip per concern.
 *
 * Every query runs through the RLS client, so a staff user's figures are
 * automatically narrowed to their assigned requests without a single `where`
 * clause here. That is deliberate: duplicating the scoping rule in application
 * code is how the two drift apart.
 */

export type DashboardStats = {
  total: number;
  awaitingClient: number;
  /** Derived from due dates, NOT a status. A subset of awaitingClient. */
  overdue: number;
  completed: number;
  underReview: number;
  received: number;
  requested: number;
  /** Share of requests whose documents are no longer outstanding. */
  collectedPercent: number;
};

type RequestRow = {
  id: string;
  status: Status;
  due_date: string | null;
};

export async function getDashboardStats(today: IstDate = todayIst()): Promise<DashboardStats> {
  const supabase = await createClient();

  // Statuses and due dates only. Counting in JS over a few hundred rows is
  // cheaper than six round trips, and keeps "overdue" defined in exactly one
  // place (lib/status) rather than half here and half in SQL.
  const { data, error } = await supabase.from("requests").select("id, status, due_date");
  if (error) throw error;

  const rows = (data ?? []) as RequestRow[];

  const byStatus = (status: Status) => rows.filter((r) => r.status === status).length;

  const awaitingClient = byStatus("awaiting_client");
  const overdue = rows.filter((r) =>
    isOverdue({ status: r.status, dueDate: r.due_date, todayIst: today }),
  ).length;

  const total = rows.length;
  // "Collected" means the firm is no longer waiting on the client.
  const outstanding = awaitingClient + byStatus("requested");
  const collectedPercent = total === 0 ? 0 : Math.round(((total - outstanding) / total) * 100);

  return {
    total,
    awaitingClient,
    overdue,
    completed: byStatus("completed"),
    underReview: byStatus("under_review"),
    received: byStatus("received"),
    requested: byStatus("requested"),
    collectedPercent,
  };
}

export type AttentionItem = {
  id: string;
  clientName: string;
  templateName: string;
  periodLabel: string;
  collected: number;
  total: number;
  dueLabel: string;
  urgency: "overdue" | "due-today" | "due-soon";
};

/** The rows a firm should act on first: soonest due, overdue at the top. */
export async function getNeedsAttention(
  limit = 5,
  today: IstDate = todayIst(),
): Promise<AttentionItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("requests")
    .select("id, title, period_label, due_date, status, clients(name), request_items(status)")
    .not("status", "in", "(completed,cancelled)")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const described = describeDueDate(row.due_date, today);
    // Anything further out than a week is not "needs attention" yet.
    if (described.tone === "upcoming" || described.tone === "none") return [];

    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    const items = (row.request_items ?? []) as { status: string }[];
    const collected = items.filter(
      (i) => i.status !== "requested" && i.status !== "awaiting_client",
    ).length;

    return [
      {
        id: row.id,
        clientName: client?.name ?? "Unknown client",
        templateName: row.title,
        periodLabel: row.period_label,
        collected,
        total: items.length,
        dueLabel: described.label,
        urgency: described.tone,
      },
    ];
  });
}

export type ActivityItem = {
  id: string;
  verb: string;
  targetType: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
  timeAgo: string;
};

export async function getRecentActivity(limit = 6): Promise<ActivityItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activity_events")
    .select("id, verb, target_type, metadata, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: String(row.id),
      verb: row.verb,
      targetType: row.target_type,
      actorName: actor?.full_name?.trim() || null,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      timeAgo: timeAgo(row.created_at),
    };
  });
}

export async function getClientCount(): Promise<{ active: number; addedThisMonth: number }> {
  const supabase = await createClient();

  const { count: active } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  const monthStart = `${todayIst().slice(0, 7)}-01`;
  const { count: addedThisMonth } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${monthStart}T00:00:00+05:30`);

  return { active: active ?? 0, addedThisMonth: addedThisMonth ?? 0 };
}

export type DashboardData = {
  stats: DashboardStats;
  attention: AttentionItem[];
  activity: ActivityItem[];
  clients: { active: number; addedThisMonth: number };
};

export async function getDashboard(_session: Session): Promise<DashboardData> {
  const today = todayIst();
  const [stats, attention, activity, clients] = await Promise.all([
    getDashboardStats(today),
    getNeedsAttention(5, today),
    getRecentActivity(6),
    getClientCount(),
  ]);
  return { stats, attention, activity, clients };
}
