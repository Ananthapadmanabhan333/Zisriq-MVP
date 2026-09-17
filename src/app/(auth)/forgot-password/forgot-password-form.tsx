"use client";

import { useActionState } from "react";

import { requestPasswordReset } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  // Success is reported for any well-formed address, registered or not, so this
  // form cannot be used to discover which emails have accounts.
  if (state?.ok) {
    return (
      <div className="mt-6">
        <FormBanner tone="success">
          If that email has an account, a reset link is on its way. Check your inbox and your spam
          folder.
        </FormBanner>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

      <Field label="Email" name="email" errors={errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          invalid={Boolean(errors?.email)}
          placeholder="you@firm.in"
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
