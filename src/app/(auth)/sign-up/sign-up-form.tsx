"use client";

import { useActionState } from "react";

import { signUp } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

      <Field label="Your name" name="fullName" errors={errors?.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          invalid={Boolean(errors?.fullName)}
          placeholder="Anantha P."
        />
      </Field>

      <Field label="Work email" name="email" errors={errors?.email}>
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

      <Field
        label="Password"
        name="password"
        errors={errors?.password}
        hint="At least 10 characters. Length beats symbols."
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

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
