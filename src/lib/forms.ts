/**
 * Form helpers shared by server actions.
 *
 * Deliberately NOT `server-only`: this is pure string handling with no secrets,
 * and putting it behind that boundary only makes it untestable.
 */
/**
 * Reads a FormData into a plain object for Zod.
 *
 * Do NOT use `formData.get(name)` directly. It returns `null` for an absent
 * field, and `z.string().optional()` rejects `null` — `.optional()` permits
 * `undefined`, which is a different thing. A form that simply omits an optional
 * hidden input therefore fails validation on a field the user cannot see, and
 * the form renders no error anywhere, because there is nothing on screen to
 * attach it to. The submit button just stops working.
 *
 * Iterating entries avoids that by construction: an absent field is absent from
 * the object, which is exactly what `.optional()` expects.
 *
 * Empty strings are preserved rather than coerced, so a required field that was
 * submitted blank still produces its own "Enter your…" message rather than a
 * generic "Required".
 */
export function formFields(formData: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    // React injects its own action bookkeeping into the payload.
    if (key.startsWith("$ACTION")) continue;
    if (typeof value === "string") fields[key] = value;
  }
  return fields;
}
