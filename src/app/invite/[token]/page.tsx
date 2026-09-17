import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROLE_LABELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite, resolveInvite } from "@/server/services/invites";

export const metadata: Metadata = {
  title: "Join a firm",
  robots: { index: false, follow: false },
};

/** The URL carries a credential, so nothing here may be cached. */
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
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
      <main className="bg-card ring-border/60 w-full max-w-[440px] rounded-2xl p-8 text-center ring-1">
        {children}
      </main>
    </div>
  );
}

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;

  const invite = await resolveInvite(token);
  if (!invite) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">This invitation is no longer valid</h1>
        <p className="text-muted-foreground mt-3 text-[15px]">
          It may have expired, been withdrawn, or already been used. Ask for a new one.
        </p>
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in: send them to create an account with the invited address, and
  // come straight back here afterwards.
  if (!user) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Join {invite.firmName}</h1>
        <p className="text-muted-foreground mt-3 text-[15px]">
          You have been invited as {ROLE_LABELS[invite.role]}. Sign in as{" "}
          <strong className="text-foreground">{invite.email}</strong> to accept.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={`/sign-up?next=/invite/${token}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 py-3 font-medium transition-colors"
          >
            Create an account
          </Link>
          <Link
            href={`/login?next=/invite/${token}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            I already have one
          </Link>
        </div>
      </Shell>
    );
  }

  const result = await acceptInvite({
    token,
    userId: user.id,
    userEmail: user.email ?? "",
  });

  if (!result.ok) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Could not accept this invitation</h1>
        <p className="text-muted-foreground mt-3 text-[15px]">{result.reason}</p>
        <Link
          href="/dashboard"
          className="text-primary mt-6 inline-block font-medium hover:underline"
        >
          Go to your dashboard
        </Link>
      </Shell>
    );
  }

  redirect("/dashboard");
}
