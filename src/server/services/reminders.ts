import "server-only";

import { addDays, daysBetween, todayIst, type IstDate } from "@/lib/dates";

/**
 * When to chase a client, expressed as pure functions over dates.
 *
 * Kept free of I/O so the schedule can be tested exhaustively without a database
 * or a clock. The cron route does the reading and writing; this decides what
 * should exist.
 */

export type ReminderType = "initial" | "follow_up" | "overdue" | "staff_digest";

export type PlannedReminder = {
  type: ReminderType;
  sequenceNo: number;
  scheduledFor: IstDate;
};

export type CadenceSettings = {
  /** Days AFTER sending to nudge, while still awaiting the client. */
  followUpDays: number[];
  /** Once overdue, chase every N days. */
  overdueEveryDays: number;
  /** Stop after this many overdue notices, so it never becomes harassment. */
  overdueCap: number;
};

export const DEFAULT_CADENCE: CadenceSettings = {
  followUpDays: [3, 7],
  overdueEveryDays: 3,
  overdueCap: 5,
};

/**
 * The full schedule for one request.
 *
 * Follow-ups are relative to when the request was SENT, not when it was created:
 * a request drafted in March and sent in July should chase from July.
 *
 * Overdue notices are relative to the due date and capped. A firm that chases
 * forever trains its clients to ignore the emails, which is worse than not
 * sending them.
 */
export function planReminders(params: {
  sentOn: IstDate | null;
  dueDate: IstDate | null;
  cadence?: CadenceSettings;
}): PlannedReminder[] {
  const cadence = params.cadence ?? DEFAULT_CADENCE;
  const plan: PlannedReminder[] = [];

  // Nothing to chase until the client has actually been asked.
  if (!params.sentOn) return plan;

  plan.push({ type: "initial", sequenceNo: 0, scheduledFor: params.sentOn });

  cadence.followUpDays
    .filter((days) => days > 0)
    .sort((a, b) => a - b)
    .forEach((days, index) => {
      const scheduledFor = addDays(params.sentOn!, days);
      // A follow-up that would land after the deadline is noise: the overdue
      // series takes over at that point and says something more useful.
      if (params.dueDate && scheduledFor > params.dueDate) return;
      plan.push({ type: "follow_up", sequenceNo: index + 1, scheduledFor });
    });

  if (params.dueDate && cadence.overdueCap > 0) {
    for (let n = 1; n <= cadence.overdueCap; n++) {
      plan.push({
        type: "overdue",
        sequenceNo: n,
        scheduledFor: addDays(params.dueDate, n * cadence.overdueEveryDays),
      });
    }
  }

  return plan;
}

/**
 * Which planned reminders are due to send.
 *
 * Anything scheduled in the past is included, not just today's. A cron run that
 * fails or is skipped must not silently drop a nudge — but the caller dedupes on
 * (request, type, sequence_no), so a backlog sends once, not once per missed day.
 */
export function dueReminders(plan: PlannedReminder[], today: IstDate = todayIst()) {
  return plan.filter((reminder) => reminder.scheduledFor <= today);
}

/**
 * Whether a request should still be chased at all.
 *
 * Terminal states stop immediately. So does a request with nothing outstanding —
 * a client who has uploaded everything must not be asked again while the firm
 * reviews it.
 */
export function shouldChase(params: { status: string; outstandingItems: number }): boolean {
  if (params.status === "completed" || params.status === "cancelled") return false;
  if (params.status === "received" || params.status === "under_review") return false;
  return params.outstandingItems > 0;
}

/** How overdue, in days. Negative means not yet due. */
export function overdueBy(dueDate: IstDate | null, today: IstDate = todayIst()): number {
  if (!dueDate) return -Infinity;
  return daysBetween(dueDate, today);
}
