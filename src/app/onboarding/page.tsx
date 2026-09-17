import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/server/auth/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your firm" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already has a firm — nothing to set up.
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="dark bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2.5">
        <span
          className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl text-xl font-bold"
          aria-hidden
        >
          Z
        </span>
        <span className="text-[19px] font-semibold tracking-[0.18em]">ZISRIQ</span>
      </div>

      <main className="bg-card ring-border/60 w-full max-w-[460px] rounded-2xl p-8 ring-1">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your firm</h1>
        <p className="text-muted-foreground mt-2 text-[15px]">
          This is the name your clients see on upload links and reminder emails.
        </p>
        <OnboardingForm />
      </main>
    </div>
  );
}
