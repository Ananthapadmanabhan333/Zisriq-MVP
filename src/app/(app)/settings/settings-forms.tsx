"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";
import { updateFirmSettings, updateProfile } from "@/server/actions/settings";

export type FirmSettings = {
  name: string;
  emailSenderName: string;
  followUpDays: number[];
  overdueEveryDays: number;
  overdueCap: number;
  portalTokenTtlDays: number;
};

export function FirmSettingsForm({ settings }: { settings: FirmSettings }) {
  const [state, formAction, pending] = useActionState(updateFirmSettings, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}
      {state?.ok ? <FormBanner tone="success">Settings saved.</FormBanner> : null}

      <Field
        label="Firm name"
        name="name"
        errors={errors?.name}
        hint="Shown to clients on upload pages and reminder emails."
      >
        <Input
          id="name"
          name="name"
          required
          defaultValue={settings.name}
          invalid={Boolean(errors?.name)}
        />
      </Field>

      <Field
        label="Email sender name"
        name="emailSenderName"
        errors={errors?.emailSenderName}
        hint="Leave blank to use the firm name."
      >
        <Input
          id="emailSenderName"
          name="emailSenderName"
          defaultValue={settings.emailSenderName}
        />
      </Field>

      <div className="border-border/60 border-t pt-5">
        <h3 className="text-[15px] font-medium">Chasing</h3>
        <p className="text-muted-foreground mt-1 text-[13px]">
          How often Zisriq nudges a client who has not uploaded yet.
        </p>
      </div>

      <Field
        label="Follow up after (days)"
        name="followUpDays"
        errors={errors?.followUpDays}
        hint="Days after sending, comma separated. e.g. 3,7"
      >
        <Input
          id="followUpDays"
          name="followUpDays"
          defaultValue={settings.followUpDays.join(", ")}
          invalid={Boolean(errors?.followUpDays)}
          placeholder="3, 7"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Once overdue, chase every (days)"
          name="overdueEveryDays"
          errors={errors?.overdueEveryDays}
        >
          <Input
            id="overdueEveryDays"
            name="overdueEveryDays"
            type="number"
            min={1}
            max={30}
            defaultValue={settings.overdueEveryDays}
          />
        </Field>

        <Field
          label="Stop after (notices)"
          name="overdueCap"
          errors={errors?.overdueCap}
          hint="0 turns overdue chasing off."
        >
          <Input
            id="overdueCap"
            name="overdueCap"
            type="number"
            min={0}
            max={20}
            defaultValue={settings.overdueCap}
          />
        </Field>
      </div>

      <Field
        label="Upload links expire after (days)"
        name="portalTokenTtlDays"
        errors={errors?.portalTokenTtlDays}
        hint="Shorter is safer. A link is a credential."
      >
        <Input
          id="portalTokenTtlDays"
          name="portalTokenTtlDays"
          type="number"
          min={1}
          max={365}
          defaultValue={settings.portalTokenTtlDays}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [state, formAction, pending] = useActionState(updateProfile, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}
      {state?.ok ? <FormBanner tone="success">Saved.</FormBanner> : null}

      <Field label="Your name" name="fullName" errors={errors?.fullName}>
        <Input
          id="fullName"
          name="fullName"
          required
          defaultValue={fullName}
          invalid={Boolean(errors?.fullName)}
        />
      </Field>

      <Field label="Phone" name="phone" errors={errors?.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} />
      </Field>

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
