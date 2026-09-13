/**
 * Status vocabulary and the legal transitions between states.
 *
 * The database is the authority: `app.status_transition_allowed()` enforces this
 * same table in a trigger, so an illegal move is rejected even if it bypasses
 * the application entirely. This module exists so the UI can decide which
 * actions to offer without a round trip, and so the rules are readable in one
 * place. The two must agree — `tests/integration/status-transitions.test.ts`
 * asserts that by driving the database with every pair.
 */

export const STATUSES = [
  "requested",
  "awaiting_client",
  "received",
  "under_review",
  "completed",
  "cancelled",
] as const;

export type Status = (typeof STATUSES)[number];

export const TERMINAL_STATUSES: readonly Status[] = ["completed", "cancelled"];

/**
 * requested       -> awaiting_client | cancelled
 * awaiting_client -> received        | cancelled
 * received        -> under_review    | awaiting_client | cancelled
 * under_review    -> completed       | awaiting_client | received | cancelled
 * completed       -> (terminal)
 * cancelled       -> (terminal)
 *
 * `under_review -> awaiting_client` is how a rejection sends work back to the
 * client. Reopening a completed request is not a transition; it is a new request.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<Status, readonly Status[]>> = {
  requested: ["awaiting_client", "cancelled"],
  awaiting_client: ["received", "cancelled"],
  received: ["under_review", "awaiting_client", "cancelled"],
  under_review: ["completed", "awaiting_client", "received", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: Status, to: Status): boolean {
  if (from === to) return true; // a write that does not move the status is not a transition
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: Status): readonly Status[] {
  return ALLOWED_TRANSITIONS[from];
}

export function isTerminal(status: Status): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export class IllegalTransitionError extends Error {
  constructor(
    readonly from: Status,
    readonly to: Status,
  ) {
    super(`illegal status transition ${from} -> ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function assertTransition(from: Status, to: Status): void {
  if (!canTransition(from, to)) throw new IllegalTransitionError(from, to);
}

/** Human-readable labels. Plain language, because clients read some of these. */
export const STATUS_LABELS: Readonly<Record<Status, string>> = {
  requested: "Draft",
  awaiting_client: "Waiting on client",
  received: "Documents received",
  under_review: "Under review",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * `overdue` is a derived flag, never a stored status. See DECISIONS.md D-007.
 * Both dates must already be expressed in Asia/Kolkata — use `@/lib/dates`.
 */
export function isOverdue(params: {
  status: Status;
  dueDate: string | null;
  todayIst: string;
}): boolean {
  const { status, dueDate, todayIst } = params;
  if (dueDate === null) return false;
  if (isTerminal(status)) return false;
  return dueDate < todayIst;
}
