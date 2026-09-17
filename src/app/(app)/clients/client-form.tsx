"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/select";
import { CLIENT_TYPE_LABELS, CLIENT_TYPES } from "@/lib/validation/client";
import type { ActionResult } from "@/server/actions/types";

export type ClientDefaults = {
  id?: string;
  name?: string;
  type?: string;
  pan?: string | null;
  gstin?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
};

export function ClientForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (prev: unknown, formData: FormData) => Promise<ActionResult>;
  defaults?: ClientDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {defaults.id ? <input type="hidden" name="id" value={defaults.id} /> : null}

      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}
      {state?.ok ? <FormBanner tone="success">Saved.</FormBanner> : null}

      <Field label="Client name" name="name" errors={errors?.name}>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaults.name}
          invalid={Boolean(errors?.name)}
          placeholder="Kirloskar Auto Pvt Ltd"
        />
      </Field>

      <Field label="Type" name="type" errors={errors?.type}>
        <Select id="type" name="type" defaultValue={defaults.type ?? "individual"} required>
          {CLIENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {CLIENT_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="PAN" name="pan" errors={errors?.pan} hint="Optional">
          <Input
            id="pan"
            name="pan"
            defaultValue={defaults.pan ?? ""}
            invalid={Boolean(errors?.pan)}
            placeholder="AAAPZ1234C"
            className="font-mono uppercase"
            maxLength={10}
          />
        </Field>

        <Field label="GSTIN" name="gstin" errors={errors?.gstin} hint="Checksum is verified">
          <Input
            id="gstin"
            name="gstin"
            defaultValue={defaults.gstin ?? ""}
            invalid={Boolean(errors?.gstin)}
            placeholder="27AAAPZ1234C1Z5"
            className="font-mono uppercase"
            maxLength={15}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Contact name" name="contactName" errors={errors?.contactName}>
          <Input id="contactName" name="contactName" defaultValue={defaults.contactName ?? ""} />
        </Field>

        <Field label="Contact phone" name="contactPhone" errors={errors?.contactPhone}>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            defaultValue={defaults.contactPhone ?? ""}
          />
        </Field>
      </div>

      <Field
        label="Contact email"
        name="contactEmail"
        errors={errors?.contactEmail}
        hint="Where upload links and reminders are sent."
      >
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={defaults.contactEmail ?? ""}
          invalid={Boolean(errors?.contactEmail)}
        />
      </Field>

      <Field label="Notes" name="notes" errors={errors?.notes}>
        <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
