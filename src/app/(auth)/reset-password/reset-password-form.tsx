"use client";

import { useActionState } from "react";

import { resetPassword } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPassword, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

      <Field
        label="New password"
        name="password"
        errors={errors?.password}
        hint="At least 10 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          invalid={Boolean(errors?.password)}
        />
      </Field>

      <Field label="Confirm new password" name="confirmPassword" errors={errors?.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          invalid={Boolean(errors?.confirmPassword)}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
