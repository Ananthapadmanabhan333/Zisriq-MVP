/**
 * Guards the bug that made the sign-up button silently do nothing.
 *
 * `formData.get("next")` returns `null` for an absent field. `z.string().optional()`
 * accepts `undefined` but REJECTS `null`, so a form that omits an optional hidden
 * input failed validation on a field with no UI — and therefore rendered no error
 * at all. The button just stopped working, with a 200 in the logs.
 */
import { describe, expect, it } from "vitest";

import { formFields } from "@/lib/forms";
import { loginSchema, signUpSchema } from "@/lib/validation/auth";

function formOf(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("formFields", () => {
  it("omits absent fields rather than reporting them as null", () => {
    const fields = formFields(formOf({ email: "a@b.com" }));
    expect("next" in fields).toBe(false);
    expect(fields.next).toBeUndefined();
  });

  it("strips React's action bookkeeping", () => {
    const fd = formOf({ email: "a@b.com" });
    fd.set("$ACTION_ID_abc", "whatever");
    fd.set("$ACTION_KEY", "k123");
    expect(Object.keys(formFields(fd))).toEqual(["email"]);
  });

  it("preserves empty strings, so required fields give their own message", () => {
    expect(formFields(formOf({ email: "" })).email).toBe("");
  });
});

describe("schemas accept a form that omits optional fields", () => {
  it("sign-up, which has no next input at all", () => {
    const result = signUpSchema.safeParse(
      formFields(
        formOf({
          fullName: "Browser Owner",
          email: "browser@testfirm.example",
          password: "correct-horse-battery",
        }),
      ),
    );
    expect(result.success).toBe(true);
  });

  it("login, which does carry next", () => {
    const result = loginSchema.safeParse(
      formFields(formOf({ email: "a@b.com", password: "whatever", next: "/clients" })),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.next).toBe("/clients");
  });

  it("login without next", () => {
    const result = loginSchema.safeParse(
      formFields(formOf({ email: "a@b.com", password: "whatever" })),
    );
    expect(result.success).toBe(true);
  });
});
