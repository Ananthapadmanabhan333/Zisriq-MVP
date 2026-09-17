import Link from "next/link";
import { ChevronRight, FileText, Plus, UserPlus, UsersRound, type LucideIcon } from "lucide-react";

type Action = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const actions: Action[] = [
  {
    label: "Add Client",
    description: "Create a new client record",
    href: "/clients/new",
    icon: UserPlus,
  },
  {
    label: "Create Template",
    description: "Build a reusable checklist",
    href: "/templates/new",
    icon: FileText,
  },
  {
    label: "Invite Member",
    description: "Grow your team",
    href: "/members/invite",
    icon: UsersRound,
  },
];

export function QuickActions() {
  return (
    <section className="bg-card ring-border/60 space-y-3 rounded-2xl p-4 ring-1">
      <h2 className="sr-only">Quick actions</h2>

      {/* The single primary action on the page. Everything else is secondary,
          which is what keeps the gold meaningful. */}
      <Link
        href="/requests/new"
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-3 rounded-xl px-5 py-4 font-medium transition-colors"
      >
        <Plus className="size-5 shrink-0" aria-hidden />
        <span className="flex-1 text-[15px]">New Request</span>
        <ChevronRight className="size-4.5 shrink-0" aria-hidden />
      </Link>

      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="bg-surface-raised/60 hover:bg-surface-raised ring-border/50 flex items-center gap-3.5 rounded-xl px-4 py-3.5 ring-1 transition-colors"
          >
            <span
              className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-xl"
              aria-hidden
            >
              <Icon className="text-muted-foreground size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-medium">{action.label}</span>
              <span className="text-muted-foreground block truncate text-[13px]">
                {action.description}
              </span>
            </span>
          </Link>
        );
      })}
    </section>
  );
}
