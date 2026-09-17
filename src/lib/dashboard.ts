/**
 * Dashboard figures, as plain data.
 *
 * Deliberately separate from `@/server/services/dashboard`: that module imports
 * the Supabase client, which parses environment variables on import, so anything
 * living there cannot be unit tested without a configured environment. These are
 * pure functions over a stats object and belong where they can be exercised.
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

/**
 * The status breakdown for the donut.
 *
 * Built here rather than in the page so that it can be tested, and so the
 * invariant is stated once: the non-subset segments MUST sum to the total. A
 * status that exists in the enum but is missing from this list silently
 * disappears from the chart while still counting toward the headline figure,
 * which is how a dashboard starts lying. `overdue` is the single exception and
 * is flagged as a subset, because it is derived rather than a status. See D-020.
 */
export type StatusSegment = {
  label: string;
  count: number;
  colorVar: string;
  subset?: boolean;
};

export function statusSegments(stats: DashboardStats): StatusSegment[] {
  return [
    { label: "Completed", count: stats.completed, colorVar: "var(--received)" },
    { label: "Under review", count: stats.underReview, colorVar: "var(--review)" },
    { label: "Received", count: stats.received, colorVar: "var(--chart-5)" },
    { label: "Awaiting client", count: stats.awaitingClient, colorVar: "var(--awaiting)" },
    { label: "Draft", count: stats.requested, colorVar: "var(--chart-4)" },
    { label: "overdue", count: stats.overdue, colorVar: "var(--overdue)", subset: true },
  ];
}

/** True when the mutually exclusive segments account for every request. */
export function segmentsReconcile(stats: DashboardStats): boolean {
  const total = statusSegments(stats)
    .filter((segment) => !segment.subset)
    .reduce((sum, segment) => sum + segment.count, 0);
  return total === stats.total;
}
