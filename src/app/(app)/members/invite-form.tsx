"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FormBanner, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from "@/lib/permissions";
import { inviteMember } from "@/server/actions/members";

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteMember, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {state && !state.ok && !state.fieldErrors ? (
        <FormBanner tone="error">{state.message}</FormBanner>
      ) : null}

      {state?.ok ? (
        <div className="space-y-3">
          <FormBanner tone="success">
            {state.data.emailed
              ? "Invitation sent."
              : "Invitation created. Email is not configured, so send this link yourself."}
          </FormBanner>
          {/* Shown regardless: the link is the only way in, and an admin who
              cannot see it has no recovery when email silently fails. */}
          <input
            readOnly
            value={state.data.url}
            aria-label="Invitation link"
            onFocus={(e) => e.currentTarget.select()}
            className="bg-surface-raised ring-border/50 w-full rounded-xl px-3 py-2 font-mono text-[12px] ring-1 outline-none"
          />
        </div>
      ) : null}

      <Field label="Email" name="email" errors={errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          required
          invalid={Boolean(errors?.email)}
          placeholder="colleague@firm.in"
        />
      </Field>

      <Field label="Role" name="role" errors={errors?.role}>
        <Select id="role" name="role" defaultValue="staff" required>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]} — {ROLE_DESCRIPTIONS[role]}
            </option>
          ))}
        </Select>
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Send invitation"}
      </Button>
    </form>
  );
}
