import { cn } from "@/lib/utils";

export function Select({
  className,
  invalid,
  ...props
}: React.ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        "bg-card ring-border h-12 w-full appearance-none rounded-xl px-4 text-[15px] ring-1 transition-shadow outline-none",
        "focus:ring-ring focus:ring-2",
        invalid && "ring-destructive focus:ring-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: React.ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        "bg-card ring-border placeholder:text-muted-foreground min-h-24 w-full rounded-xl px-4 py-3 text-[15px] ring-1 transition-shadow outline-none",
        "focus:ring-ring focus:ring-2",
        invalid && "ring-destructive focus:ring-destructive",
        className,
      )}
      {...props}
    />
  );
}
