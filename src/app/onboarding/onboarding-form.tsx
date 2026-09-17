"use client";

import { useActionState } from "react";

import { createFirm } from "@/server/actions/firm";
import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createFirm, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

      <Field
        label="Firm name"
        name="name"
        errors={errors?.name}
        hint="You can change this later in Settings."
      >
        <Input
          id="name"
          name="name"
          required
          autoFocus
          invalid={Boolean(errors?.name)}
          placeholder="ACME & Co."
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create firm"}
      </Button>
    </form>
  );
}
