import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  IllegalTransitionError,
  STATUSES,
  assertTransition,
  canTransition,
  isOverdue,
  isTerminal,
  nextStatuses,
  type Status,
} from "@/lib/status";

describe("status transitions", () => {
  it("allows the documented happy path end to end", () => {
    const path: Status[] = [
      "requested",
      "awaiting_client",
      "received",
      "under_review",
      "completed",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("allows cancelling from every non-terminal state", () => {
    for (const from of STATUSES) {
      if (isTerminal(from)) continue;
      expect(canTransition(from, "cancelled")).toBe(true);
    }
  });

  it("treats completed and cancelled as terminal", () => {
    for (const terminal of ["completed", "cancelled"] as const) {
      expect(nextStatuses(terminal)).toHaveLength(0);
      for (const to of STATUSES) {
        if (to === terminal) continue;
        expect(canTransition(terminal, to)).toBe(false);
      }
    }
  });

  it("sends work back to the client when a review rejects it", () => {
    expect(canTransition("under_review", "awaiting_client")).toBe(true);
    expect(canTransition("received", "awaiting_client")).toBe(true);
  });

  it("refuses to skip the client step", () => {
    expect(canTransition("requested", "received")).toBe(false);
    expect(canTransition("requested", "completed")).toBe(false);
    expect(canTransition("awaiting_client", "completed")).toBe(false);
  });

  it("refuses to reopen a completed request", () => {
    expect(canTransition("completed", "under_review")).toBe(false);
    expect(canTransition("completed", "awaiting_client")).toBe(false);
  });

  it("treats a no-op write as legal", () => {
    for (const s of STATUSES) expect(canTransition(s, s)).toBe(true);
  });

  it("throws a typed error naming both ends of an illegal move", () => {
    expect(() => assertTransition("completed", "requested")).toThrow(IllegalTransitionError);
    expect(() => assertTransition("completed", "requested")).toThrow(/completed -> requested/);
  });

  it("defines a transition list for every status, with no unknown targets", () => {
    for (const from of STATUSES) {
      expect(ALLOWED_TRANSITIONS[from]).toBeDefined();
      for (const to of ALLOWED_TRANSITIONS[from]) {
        expect(STATUSES).toContain(to);
        expect(to).not.toBe(from);
      }
    }
  });
});

describe("isOverdue", () => {
  const today = "2026-09-13";

  it("is false when there is no due date", () => {
    expect(isOverdue({ status: "awaiting_client", dueDate: null, todayIst: today })).toBe(false);
  });

  it("is true once the due date has passed and work is outstanding", () => {
    expect(isOverdue({ status: "awaiting_client", dueDate: "2026-09-12", todayIst: today })).toBe(
      true,
    );
  });

  it("is false on the due date itself — a request is not late until the day after", () => {
    expect(isOverdue({ status: "awaiting_client", dueDate: today, todayIst: today })).toBe(false);
  });

  it("is false for terminal states regardless of the due date", () => {
    expect(isOverdue({ status: "completed", dueDate: "2020-01-01", todayIst: today })).toBe(false);
    expect(isOverdue({ status: "cancelled", dueDate: "2020-01-01", todayIst: today })).toBe(false);
  });

  it("applies to every non-terminal state, not just awaiting_client", () => {
    for (const status of STATUSES) {
      if (isTerminal(status)) continue;
      expect(isOverdue({ status, dueDate: "2026-09-01", todayIst: today })).toBe(true);
    }
  });
});
