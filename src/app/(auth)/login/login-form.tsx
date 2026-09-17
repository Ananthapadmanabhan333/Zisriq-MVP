"use client";

import Link from "next/link";
import { useActionState } from "react";

import { login } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="next" value={next} />

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

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(errors?.password)}
        />
        {errors?.password ? (
          <p className="text-destructive mt-2 text-sm">{errors.password[0]}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
