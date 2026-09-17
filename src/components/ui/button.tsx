import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * `primary` is the gold one. Exactly one per screen — see DECISIONS.md D-019.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-foreground ring-1 ring-border hover:bg-surface-raised",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-12 px-6 text-[15px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
