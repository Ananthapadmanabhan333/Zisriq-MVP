import type { LucideIcon } from "lucide-react";

/**
 * Empty states carry their weight here: a firm's first week is entirely empty
 * screens, and "No data" teaches nobody what to do next.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card ring-border/60 flex flex-col items-center rounded-2xl px-8 py-16 text-center ring-1">
      <span
        className="bg-secondary text-muted-foreground flex size-14 items-center justify-center rounded-full"
        aria-hidden
      >
        <Icon className="size-6" />
      </span>
      <p className="mt-5 text-[17px] font-medium">{title}</p>
      <p className="text-muted-foreground mt-2 max-w-[42ch] text-[15px]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
