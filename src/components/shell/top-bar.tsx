import { Bell, ChevronDown, Search } from "lucide-react";

export function TopBar({
  firmName,
  userName,
  userInitials,
  hasUnread = false,
}: {
  firmName: string;
  userName: string;
  userInitials: string;
  hasUnread?: boolean;
}) {
  return (
    <header className="flex items-center gap-6 px-8 pt-7 pb-6">
      {/* Static in this reference. Wiring search is its own piece of work -- it
          has to span clients, requests and documents without leaking across
          firms, so every query runs under RLS. */}
      <div className="relative max-w-[560px] flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-5 size-[18px] -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search clients, requests, documents..."
          aria-label="Search"
          className="bg-card ring-border/60 placeholder:text-muted-foreground focus:ring-ring h-[52px] w-full rounded-2xl pr-20 pl-[52px] text-[15px] ring-1 outline-none focus:ring-2"
        />
        <kbd className="text-muted-foreground bg-secondary/80 pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 rounded-md px-2 py-1 font-sans text-xs">
          ⌘ K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          aria-label={hasUnread ? "Notifications, unread" : "Notifications"}
          className="bg-card ring-border/60 hover:bg-surface-raised relative flex size-[52px] items-center justify-center rounded-2xl ring-1 transition-colors"
        >
          <Bell className="size-[19px]" aria-hidden />
          {hasUnread ? (
            <span
              className="bg-primary ring-card absolute top-3.5 right-3.5 size-2.5 rounded-full ring-2"
              aria-hidden
            />
          ) : null}
        </button>

        <button
          type="button"
          className="hover:bg-card flex items-center gap-3 rounded-2xl py-1.5 pr-3 pl-1.5 transition-colors"
        >
          <span
            className="bg-secondary text-foreground flex size-11 items-center justify-center rounded-full text-sm font-semibold"
            aria-hidden
          >
            {userInitials}
          </span>
          <span className="text-left">
            <span className="block text-[15px] font-medium">{userName}</span>
            <span className="text-muted-foreground block text-[13px]">{firmName}</span>
          </span>
          <ChevronDown className="text-muted-foreground size-4" aria-hidden />
        </button>
      </div>
    </header>
  );
}
