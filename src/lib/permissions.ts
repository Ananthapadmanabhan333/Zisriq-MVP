/**
 * What each role may do, in one place.
 *
 * RLS is the floor: even if every check here were removed, the database would
 * still refuse cross-firm reads and writes. These functions exist so the UI can
 * avoid offering actions that would fail, and so server actions can reject a
 * request with a useful message before touching the database.
 *
 * Hiding a button is not a permission. Every server action re-checks.
 */

export const ROLES = ["admin", "accountant", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  admin: "Admin",
  accountant: "Accountant",
  staff: "Staff",
};

export const ROLE_DESCRIPTIONS: Readonly<Record<Role, string>> = {
  admin: "Full access, including billing, members and firm settings.",
  accountant: "Every client and request in the firm. Cannot change firm settings.",
  staff: "Only the requests assigned to them.",
};

/** Ordered most to least privileged. Used for "at least this role" checks. */
const RANK: Readonly<Record<Role, number>> = { admin: 3, accountant: 2, staff: 1 };

export function atLeast(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Every capability the app gates on. Adding a capability here and nowhere else
 * is the intended way to extend permissions — `can()` is exhaustive over this
 * union, so a new entry fails the build until every role is considered.
 */
export type Capability =
  | "client.create"
  | "client.update"
  | "client.archive"
  | "request.create"
  | "request.update"
  | "request.cancel"
  | "request.assign"
  | "request.review"
  | "template.manage"
  | "member.invite"
  | "member.updateRole"
  | "member.remove"
  | "firm.updateSettings"
  | "activity.viewAll";

const CAPABILITIES: Readonly<Record<Capability, readonly Role[]>> = {
  "client.create": ["admin", "accountant"],
  "client.update": ["admin", "accountant"],
  "client.archive": ["admin"],

  "request.create": ["admin", "accountant"],
  // Staff can progress a request assigned to them; scope is enforced by RLS.
  "request.update": ["admin", "accountant", "staff"],
  "request.cancel": ["admin", "accountant"],
  "request.assign": ["admin", "accountant"],
  "request.review": ["admin", "accountant", "staff"],

  "template.manage": ["admin", "accountant"],

  "member.invite": ["admin"],
  "member.updateRole": ["admin"],
  "member.remove": ["admin"],

  "firm.updateSettings": ["admin"],
  "activity.viewAll": ["admin", "accountant"],
};

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[capability].includes(role);
}

/** Thrown by server actions. Carries the capability so logs are useful. */
export class PermissionError extends Error {
  constructor(
    readonly role: Role,
    readonly capability: Capability,
  ) {
    super(`role "${role}" may not perform "${capability}"`);
    this.name = "PermissionError";
  }
}

export function assertCan(role: Role, capability: Capability): void {
  if (!can(role, capability)) throw new PermissionError(role, capability);
}
