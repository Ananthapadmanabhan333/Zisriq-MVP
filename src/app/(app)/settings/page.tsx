import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";
import { requireSession } from "@/server/auth/session";
import { FirmSettingsForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data: firm }, { data: profile }] = await Promise.all([
    supabase
      .from("firms")
      .select(
        "name, email_sender_name, reminder_follow_up_days, reminder_overdue_every_days, reminder_overdue_cap, portal_token_ttl_days",
      )
      .eq("id", session.firmId)
      .single(),
    supabase.from("profiles").select("full_name, phone, email").eq("id", session.userId).single(),
  ]);

  const mayEditFirm = can(session.role, "firm.updateSettings");

  return (
    <main className="flex-1 space-y-6 px-8 pb-8">
      <PageHeader
        title="Settings"
        description={`You are ${ROLE_LABELS[session.role]} in ${session.firmName}.`}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Firm</h2>
          <div className="bg-card ring-border/60 rounded-2xl p-6 ring-1">
            {mayEditFirm && firm ? (
              <FirmSettingsForm
                settings={{
                  name: firm.name,
                  emailSenderName: firm.email_sender_name ?? "",
                  followUpDays: firm.reminder_follow_up_days ?? [3, 7],
                  overdueEveryDays: firm.reminder_overdue_every_days ?? 3,
                  overdueCap: firm.reminder_overdue_cap ?? 5,
                  portalTokenTtlDays: firm.portal_token_ttl_days ?? 30,
                }}
              />
            ) : (
              <p className="text-muted-foreground text-[15px]">
                Only an admin can change firm settings.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">You</h2>
          <div className="bg-card ring-border/60 rounded-2xl p-6 ring-1">
            <p className="text-muted-foreground mb-5 text-[13px]">{profile?.email}</p>
            <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? null} />
          </div>

          <div className="bg-card ring-border/60 rounded-2xl p-6 ring-1">
            <form action={signOut}>
              <Button type="submit" variant="ghost">
                Sign out
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
