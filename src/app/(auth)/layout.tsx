import Link from "next/link";

/** Centred card on the dark shell. Shared by every signed-out screen. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="dark bg-background text-foreground flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span
          className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl text-xl font-bold"
          aria-hidden
        >
          Z
        </span>
        <span className="text-[19px] font-semibold tracking-[0.18em]">ZISRIQ</span>
      </Link>

      <main className="bg-card ring-border/60 w-full max-w-[420px] rounded-2xl p-8 ring-1">
        {children}
      </main>

      <p className="text-muted-foreground mt-8 text-sm">Client documents, under control.</p>
    </div>
  );
}
