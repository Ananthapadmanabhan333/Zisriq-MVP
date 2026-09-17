import { cn } from "@/lib/utils";

/**
 * Minimal form primitives shared by every form in the app.
 *
 * Errors are wired with `aria-describedby` and `aria-invalid` rather than colour
 * alone, so the message reaches a screen reader and survives a red/green colour
 * vision deficiency.
 */

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("mb-2 block text-sm font-medium", className)} {...props} />;
}

export function Input({
  className,
  invalid,
  ...props
}: React.ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "bg-card ring-border placeholder:text-muted-foreground h-12 w-full rounded-xl px-4 text-[15px] ring-1 transition-shadow outline-none",
        "focus:ring-ring focus:ring-2",
        invalid && "ring-destructive focus:ring-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="text-destructive mt-2 text-sm">
      {messages[0]}
    </p>
  );
}

export function Field({
  label,
  name,
  errors,
  hint,
  children,
}: {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
  children?: React.ReactNode;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint ? (
        <p id={hintId} className="text-muted-foreground mt-2 text-sm">
          {hint}
        </p>
      ) : null}
      <FieldError id={errorId} messages={errors} />
    </div>
  );
}

export function FormBanner({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm ring-1",
        tone === "error"
          ? "bg-destructive/10 text-destructive ring-destructive/30"
          : "bg-received/10 text-received ring-received/30",
      )}
    >
      {children}
    </p>
  );
}
