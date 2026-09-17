import { requireSession } from "@/server/auth/session";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopBar } from "@/components/shell/top-bar";

/** Initials for the avatar. Falls back to the email when no name is set yet. */
function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]);
  return (letters.join("") || "?").toUpperCase();
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Redirects to /login when signed out, /onboarding when there is no firm yet.
  const session = await requireSession();
  const displayName = session.fullName?.trim() || session.email;

  return (
    <div className="dark bg-background text-foreground flex min-h-screen">
      <AppSidebar
        firmName={session.firmName}
        userName={displayName}
        userRole={session.role}
        userInitials={initials(session.fullName, session.email)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          firmName={session.firmName}
          userName={displayName}
          userInitials={initials(session.fullName, session.email)}
        />
        {children}
      </div>
    </div>
  );
}
