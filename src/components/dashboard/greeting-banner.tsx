export function GreetingBanner({
  dateLabel,
  greeting,
  firstName,
  attentionCount,
  quote,
}: {
  dateLabel: string;
  greeting: string;
  firstName: string;
  attentionCount: number;
  quote: string;
}) {
  return (
    <section className="bg-card ring-border/60 relative overflow-hidden rounded-2xl ring-1">
      {/* Warm falloff towards the right, where the artwork sits. Pure CSS, so
          there is no image to ship, no layout shift and nothing to art-direct
          per breakpoint. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 140% at 88% 30%, oklch(0.42 0.06 70 / 0.55) 0%, transparent 62%)",
        }}
        aria-hidden
      />

      <div className="relative flex items-center gap-8 px-8 py-7">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[15px]">{dateLabel}</p>
          <h1 className="mt-2.5 text-[32px] leading-tight font-semibold tracking-tight">
            {greeting}, {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="text-muted-foreground mt-2.5 text-[15px]">
            {attentionCount === 0
              ? "Nothing needs chasing today."
              : `${attentionCount} request${attentionCount === 1 ? " needs" : "s need"} your attention today.`}
          </p>
        </div>

        <figure className="hidden w-[230px] shrink-0 lg:block">
          <blockquote className="text-[17px] leading-relaxed italic">“{quote}”</blockquote>
          <figcaption className="text-muted-foreground mt-3 text-sm" aria-hidden>
            —
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
