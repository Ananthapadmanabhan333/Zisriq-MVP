/**
 * All business date logic for Zisriq is Asia/Kolkata, regardless of where the
 * code runs. Vercel runs in UTC; a firm in Chennai does not care.
 *
 * Timestamps are stored as `timestamptz` and are therefore unambiguous. What is
 * ambiguous is a *calendar day* — "due today" means today in IST, and at 23:00
 * UTC it is already tomorrow in Kolkata. Every comparison that decides whether
 * something is due or overdue must go through this module.
 *
 * IST is UTC+05:30 with no daylight saving, but we still resolve it through
 * `Intl` rather than adding 330 minutes by hand: the offset is then the
 * platform's problem, not ours.
 */

export const IST_TIME_ZONE = "Asia/Kolkata";

/** A calendar date in IST, as `YYYY-MM-DD`. Comparable with `<` and `>`. */
export type IstDate = string;

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The IST calendar date on which `instant` falls. */
export function toIstDate(instant: Date = new Date()): IstDate {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape we want.
  return isoFormatter.format(instant);
}

/** Today's date in IST. The reference point for every due/overdue decision. */
export function todayIst(): IstDate {
  return toIstDate(new Date());
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIstDate(value: string): value is IstDate {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

function assertIstDate(value: string, label: string): void {
  if (!isIstDate(value)) throw new RangeError(`${label} must be YYYY-MM-DD, got ${value}`);
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: IstDate, to: IstDate): number {
  assertIstDate(from, "from");
  assertIstDate(to, "to");
  const MS_PER_DAY = 86_400_000;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

/** Shift an IST calendar date by whole days. */
export function addDays(date: IstDate, days: number): IstDate {
  assertIstDate(date, "date");
  const shifted = new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * How a due date should read to a human. Deliberately returns the *words* the UI
 * shows, so "Due today" and "6 days overdue" cannot drift between screens.
 */
export type DueTone = "overdue" | "due-today" | "due-soon" | "upcoming" | "none";

export function describeDueDate(
  dueDate: IstDate | null,
  today: IstDate = todayIst(),
): { label: string; tone: DueTone; days: number | null } {
  if (dueDate === null) return { label: "No due date", tone: "none", days: null };

  const days = daysBetween(today, dueDate);

  if (days < 0) {
    const overdueBy = Math.abs(days);
    return {
      label: overdueBy === 1 ? "1 day overdue" : `${overdueBy} days overdue`,
      tone: "overdue",
      days,
    };
  }
  if (days === 0) return { label: "Due today", tone: "due-today", days };
  if (days === 1) return { label: "Due tomorrow", tone: "due-soon", days };
  if (days <= 7) return { label: `Due in ${days} days`, tone: "due-soon", days };
  return { label: `Due ${formatIstDate(dueDate)}`, tone: "upcoming", days };
}

const longDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** e.g. "18 Sep 2026". Accepts a calendar date or an instant. */
export function formatIstDate(value: IstDate | Date): string {
  const instant = value instanceof Date ? value : new Date(`${value}T12:00:00+05:30`);
  return shortDateFormatter.format(instant);
}

/** e.g. "Friday, 18 September 2026". Used for the dashboard greeting. */
export function formatIstDateLong(value: IstDate | Date = new Date()): string {
  const instant = value instanceof Date ? value : new Date(`${value}T12:00:00+05:30`);
  return longDateFormatter.format(instant);
}

/** Coarse relative time for activity feeds. Past instants only. */
export function timeAgo(instant: Date | string, now: Date = new Date()): string {
  const then = instant instanceof Date ? instant : new Date(instant);
  const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`;

  return formatIstDate(then);
}

/** "Good morning" / "Good afternoon" / "Good evening", by IST clock. */
export function istGreeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: IST_TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
