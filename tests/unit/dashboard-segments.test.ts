/**
 * The dashboard's status breakdown must reconcile with its headline total.
 *
 * This guards a real bug: "Draft" was missing from the donut, so requests in
 * `requested` counted toward Total Requests but appeared in no segment. The
 * chart quietly failed to add up, which is how a firm stops trusting the
 * numbers — the same class of error as D-020, where overdue was double-counted
 * by being shown beside awaiting instead of inside it.
 */
import { describe, expect, it } from "vitest";

import { segmentsReconcile, statusSegments, type DashboardStats } from "@/lib/dashboard";
import { STATUSES } from "@/lib/status";

function statsOf(partial: Partial<DashboardStats>): DashboardStats {
  const base: DashboardStats = {
    total: 0,
    awaitingClient: 0,
    overdue: 0,
    completed: 0,
    underReview: 0,
    received: 0,
    requested: 0,
    collectedPercent: 0,
  };
  return { ...base, ...partial };
}

describe("statusSegments", () => {
  it("accounts for every request, including drafts", () => {
    const stats = statsOf({
      total: 12,
      completed: 3,
      underReview: 2,
      received: 1,
      awaitingClient: 4,
      requested: 2,
      overdue: 3,
    });

    expect(segmentsReconcile(stats)).toBe(true);
  });

  it("fails loudly when a status is unaccounted for", () => {
    // Drafts present in the total but not in any segment: the original bug.
    const stats = statsOf({ total: 12, completed: 3, awaitingClient: 4, requested: 5 });
    const broken = { ...stats, requested: 0 };

    expect(segmentsReconcile(broken)).toBe(false);
  });

  it("does not let overdue inflate the total", () => {
    // Overdue requests are also awaiting_client. Counting them as a peer segment
    // would make the segments exceed the total.
    const stats = statsOf({ total: 5, awaitingClient: 5, overdue: 5 });

    expect(segmentsReconcile(stats)).toBe(true);
    expect(statusSegments(stats).find((s) => s.label === "overdue")?.subset).toBe(true);
  });

  it("covers every non-terminal status in the enum", () => {
    // If a status is added to zq_status and not here, it will silently vanish
    // from the chart. `cancelled` is excluded deliberately: cancelled requests
    // are not counted in the dashboard total either.
    const labels = statusSegments(statsOf({})).map((s) => s.label.toLowerCase());
    const expected: Record<string, string> = {
      requested: "draft",
      awaiting_client: "awaiting client",
      received: "received",
      under_review: "under review",
      completed: "completed",
    };

    for (const status of STATUSES) {
      if (status === "cancelled") continue;
      expect(labels, `status "${status}" has no segment`).toContain(expected[status]);
    }
  });

  it("reconciles when everything is zero", () => {
    expect(segmentsReconcile(statsOf({}))).toBe(true);
  });
});
