import { ChevronDown } from "lucide-react";

/**
 * Donut of documents collected, with the status breakdown beside it.
 *
 * The segments are mutually exclusive on purpose: a request item is in exactly
 * one of these states. "Overdue" is the exception -- it is NOT a status in the
 * schema, it is derived from the due date, so an overdue item is also awaiting
 * the client. Counting it as its own slice would double-count. It is shown here
 * as a separate line because it is what the firm actually acts on, but it is
 * carved OUT of the awaiting figure rather than added alongside it.
 * See DECISIONS.md D-020.
 */
export type ProgressSegment = {
  label: string;
  count: number;
  /** A CSS colour, taken from the status tokens. */
  color: string;
  /** True for a figure carved out of the segment above it rather than added
      beside it -- currently only "overdue", which lives inside "awaiting
      client". Rendered indented and prefixed so the arithmetic reads honestly. */
  subset?: boolean;
};

export function CollectionProgress({
  percent,
  segments,
  periodLabel,
}: {
  percent: number;
  segments: ProgressSegment[];
  periodLabel: string;
}) {
  const radius = 62;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <section className="bg-card ring-border/60 rounded-2xl p-6 ring-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collection Progress</h2>
        <button
          type="button"
          className="bg-secondary/70 text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] transition-colors"
        >
          {periodLabel}
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </div>

      <div className="mt-6 flex items-center gap-10">
        <div className="relative shrink-0">
          <svg
            width="152"
            height="152"
            viewBox="0 0 152 152"
            role="img"
            aria-label={`${percent}% of documents collected`}
          >
            <circle
              cx="76"
              cy="76"
              r={radius}
              fill="none"
              stroke="var(--secondary)"
              strokeWidth={stroke}
            />
            <circle
              cx="76"
              cy="76"
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference - dash}`}
              transform="rotate(-90 76 76)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[30px] leading-none font-semibold tracking-tight">
              {percent}
              <span className="text-lg">%</span>
            </p>
            <p className="text-muted-foreground mt-1.5 text-center text-[11px] leading-tight">
              Documents
              <br />
              collected
            </p>
          </div>
        </div>

        <ul className="flex-1 space-y-4">
          {segments.map((segment) => (
            <li
              key={segment.label}
              className={
                segment.subset ? "flex items-center gap-4 pl-6" : "flex items-center gap-4"
              }
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color }}
                aria-hidden
              />
              <span className="w-8 text-right text-[15px] font-semibold tabular-nums">
                {segment.count}
              </span>
              <span className="text-muted-foreground text-[15px]">
                {segment.subset ? <span className="opacity-70">of which </span> : null}
                {segment.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
