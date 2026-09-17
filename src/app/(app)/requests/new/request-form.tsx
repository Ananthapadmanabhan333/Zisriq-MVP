"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { createRequest } from "@/server/actions/requests";
import { ItemRows, type ItemDraft } from "../../templates/item-rows";

export type TemplateOption = {
  id: string;
  name: string;
  items: ItemDraft[];
};

export function RequestForm({
  clients,
  templates,
  members,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  templates: TemplateOption[];
  members: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(createRequest, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  // Choosing a template copies its items in, rather than linking to them. The
  // firm almost always tweaks one line per client, and a live link would mean
  // editing the template retroactively changed what a client was asked for.
  const [templateId, setTemplateId] = useState("");
  const chosen = templates.find((t) => t.id === templateId);

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

      <Field label="Client" name="clientId" errors={errors?.clientId}>
        <Select id="clientId" name="clientId" defaultValue={defaultClientId ?? ""} required>
          <option value="" disabled>
            Choose a client
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Start from a template"
        name="templateId"
        hint="Optional. Copies its documents in, which you can then edit."
      >
        <Select
          id="templateId"
          name="templateId"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          <option value="">No template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Title" name="title" errors={errors?.title}>
        <Input
          id="title"
          name="title"
          required
          defaultValue={chosen?.name ?? ""}
          key={chosen?.id ?? "no-template"}
          invalid={Boolean(errors?.title)}
          placeholder="ITR — Salaried"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Field label="Period" name="periodLabel" errors={errors?.periodLabel}>
          <Input
            id="periodLabel"
            name="periodLabel"
            required
            invalid={Boolean(errors?.periodLabel)}
            placeholder="FY 2025–26"
          />
        </Field>

        <Field label="Due date" name="dueDate" errors={errors?.dueDate} hint="IST">
          <Input id="dueDate" name="dueDate" type="date" invalid={Boolean(errors?.dueDate)} />
        </Field>

        <Field label="Assign to" name="assignedTo" errors={errors?.assignedTo}>
          <Select id="assignedTo" name="assignedTo" defaultValue="">
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <ItemRows key={chosen?.id ?? "blank"} initial={chosen?.items} error={errors?.items?.[0]} />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create request"}
      </Button>
    </form>
  );
}
