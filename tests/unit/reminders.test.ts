/**
 * The reminder schedule.
 *
 * Pure functions over dates, so this covers the cadence exhaustively without a
 * database or a clock. The cron route does the I/O; these decide what should
 * exist, and getting them wrong means either silence or harassment.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_CADENCE,
  dueReminders,
  overdueBy,
  planReminders,
  shouldChase,
} from "@/server/services/reminders";

describe("planReminders", () => {
  it("plans nothing until the request has been sent", () => {
    expect(planReminders({ sentOn: null, dueDate: "2026-09-30" })).toEqual([]);
  });

  it("counts follow-ups from the send date, not from creation", () => {
    const plan = planReminders({ sentOn: "2026-07-01", dueDate: "2026-07-31" });
    const followUps = plan.filter((r) => r.type === "follow_up");

    expect(followUps.map((r) => r.scheduledFor)).toEqual(["2026-07-04", "2026-07-08"]);
  });

  it("drops a follow-up that would land after the due date", () => {
    // The overdue series takes over and says something more useful.
    const plan = planReminders({ sentOn: "2026-07-01", dueDate: "2026-07-05" });
    const followUps = plan.filter((r) => r.type === "follow_up");

    expect(followUps.map((r) => r.scheduledFor)).toEqual(["2026-07-04"]);
  });

  it("caps overdue notices so chasing never becomes harassment", () => {
    const plan = planReminders({ sentOn: "2026-07-01", dueDate: "2026-07-10" });
    const overdue = plan.filter((r) => r.type === "overdue");

    expect(overdue).toHaveLength(DEFAULT_CADENCE.overdueCap);
    expect(overdue[0].scheduledFor).toBe("2026-07-13");
    expect(overdue.at(-1)!.scheduledFor).toBe("2026-07-25");
  });

  it("plans no overdue series without a due date", () => {
    const plan = planReminders({ sentOn: "2026-07-01", dueDate: null });
    expect(plan.filter((r) => r.type === "overdue")).toEqual([]);
  });

  it("respects a firm's own cadence", () => {
    const plan = planReminders({
      sentOn: "2026-07-01",
      dueDate: "2026-08-01",
      cadence: { followUpDays: [1, 2], overdueEveryDays: 7, overdueCap: 1 },
    });

    expect(plan.filter((r) => r.type === "follow_up").map((r) => r.scheduledFor)).toEqual([
      "2026-07-02",
      "2026-07-03",
    ]);
    expect(plan.filter((r) => r.type === "overdue").map((r) => r.scheduledFor)).toEqual([
      "2026-08-08",
    ]);
  });

  it("sends nothing when the cap is zero", () => {
    const plan = planReminders({
      sentOn: "2026-07-01",
      dueDate: "2026-07-10",
      cadence: { followUpDays: [], overdueEveryDays: 3, overdueCap: 0 },
    });
    expect(plan.filter((r) => r.type === "overdue")).toEqual([]);
  });
});

describe("dueReminders", () => {
  it("includes anything scheduled in the past, so a missed run is not dropped", () => {
    const plan = planReminders({ sentOn: "2026-07-01", dueDate: "2026-07-10" });
    const due = dueReminders(plan, "2026-07-20");

    // initial + both follow-ups + the overdue notices up to the 20th
    expect(due.length).toBeGreaterThan(3);
    expect(due.every((r) => r.scheduledFor <= "2026-07-20")).toBe(true);
  });

  it("excludes the future", () => {
    const plan = planReminders({ sentOn: "2026-07-01", dueDate: "2026-07-10" });
    expect(dueReminders(plan, "2026-07-01")).toHaveLength(1);
  });
});

describe("shouldChase", () => {
  it("stops on terminal states", () => {
    expect(shouldChase({ status: "completed", outstandingItems: 5 })).toBe(false);
    expect(shouldChase({ status: "cancelled", outstandingItems: 5 })).toBe(false);
  });

  it("stops once the ball is back with the firm", () => {
    // The client has done their part; chasing them while we review is rude.
    expect(shouldChase({ status: "received", outstandingItems: 2 })).toBe(false);
    expect(shouldChase({ status: "under_review", outstandingItems: 2 })).toBe(false);
  });

  it("stops when nothing is outstanding", () => {
    expect(shouldChase({ status: "awaiting_client", outstandingItems: 0 })).toBe(false);
  });

  it("chases while documents are still missing", () => {
    expect(shouldChase({ status: "awaiting_client", outstandingItems: 1 })).toBe(true);
  });
});

describe("overdueBy", () => {
  it("is positive once past the due date", () => {
    expect(overdueBy("2026-07-10", "2026-07-16")).toBe(6);
  });

  it("is negative before it", () => {
    expect(overdueBy("2026-07-10", "2026-07-08")).toBe(-2);
  });

  it("treats a missing due date as never overdue", () => {
    expect(overdueBy(null, "2026-07-10")).toBe(-Infinity);
  });
});
