"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";
import { Textarea } from "@/components/ui/select";
import { createTemplate } from "@/server/actions/templates";
import { ItemRows } from "../item-rows";

export function TemplateForm() {
  const [state, formAction, pending] = useActionState(createTemplate, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

      <Field label="Template name" name="name" errors={errors?.name}>
        <Input
          id="name"
          name="name"
          required
          invalid={Boolean(errors?.name)}
          placeholder="ITR — Salaried"
        />
      </Field>

      <Field label="Description" name="description" errors={errors?.description}>
        <Textarea id="description" name="description" placeholder="When to use this checklist." />
      </Field>

      <ItemRows error={errors?.items?.[0]} />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create template"}
      </Button>
    </form>
  );
}
