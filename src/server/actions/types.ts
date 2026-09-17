import "server-only";

import { z } from "zod";

/**
 * What every server action returns.
 *
 * Actions never throw for expected failures — a wrong password and a duplicate
 * email are normal outcomes, not exceptions. They return a discriminated result
 * the form can render. Unexpected failures still throw and hit the error
 * boundary, because those are bugs.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      /** Shown at the top of the form. */
      message: string;
      /** Keyed by field name, for inline errors. */
      fieldErrors?: Record<string, string[]>;
    };

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data: data as T };
}

export function fail(message: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

/** Turns a Zod failure into the shape the form renders. */
export function fromZodError(error: z.ZodError): ActionResult<never> {
  const flattened = z.flattenError(error);
  return {
    ok: false,
    message: "Please check the highlighted fields.",
    fieldErrors: flattened.fieldErrors as Record<string, string[]>,
  };
}
