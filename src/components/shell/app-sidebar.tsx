"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleDot,
  FileText,
  History,
  LayoutDashboard,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Primary workspace. Everything a firm touches daily. */
const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Requests", href: "/requests", icon: CircleDot },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Templates", href: "/templates", icon: FileText },
];

/** Firm administration. Visited occasionally, so it sits below the divider. */
const secondaryNav: NavItem[] = [
  { label: "Members", href: "/members", icon: UsersRound },
  { label: "Activity", href: "/activity", icon: History },
  { label: "Settings", href: "/settings", icon: Settings },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition-colors",
        active
          ? "bg-sidebar-accent text-foreground ring-border/60 font-medium ring-1"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
        aria-hidden
      />
      {item.label}
    </Link>
  );
}

export function AppSidebar({
  /** Only passed by the design reference, which has no router pathname. */
  activeHref,
  firmName,
  userName,
  userRole,
  userInitials,
}: {
  activeHref?: string;
  firmName: string;
  userName: string;
  userRole: string;
  userInitials: string;
}) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;

  /** A nested route still lights up its section: /clients/abc marks Clients. */
  const isActive = (href: string) => current === href || current.startsWith(`${href}/`);

  return (
    <aside className="bg-sidebar border-sidebar-border flex w-[248px] shrink-0 flex-col border-r">
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-2.5">
          <span
            className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl text-xl font-bold"
            aria-hidden
          >
            Z
          </span>
          <span className="text-[19px] font-semibold tracking-[0.18em]">ZISRIQ</span>
        </div>
        <p className="text-muted-foreground mt-3 text-[13px]">Client documents, under control.</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-4" aria-label="Main">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <hr className="border-sidebar-border my-4 mr-2 ml-4" />

        {secondaryNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="p-4">
        <Link
          href="/settings"
          className="bg-card ring-border/60 hover:bg-surface-raised flex items-center gap-3 rounded-2xl p-3 ring-1 transition-colors"
        >
          <span
            className="bg-secondary text-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            aria-hidden
          >
            {userInitials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-muted-foreground block truncate text-[13px]">{firmName}</span>
            <span className="block truncate text-sm font-medium">{userName}</span>
            <span className="text-muted-foreground block truncate text-[13px]">{userRole}</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
