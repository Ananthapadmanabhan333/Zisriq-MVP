/**
 * Copy and configuration for the public landing page.
 *
 * ⚠️ SOCIAL PROOF BELOW IS PLACEHOLDER AND MUST NOT SHIP AS-IS.
 *
 * `STATS`, `TESTIMONIAL` and `CLIENT_LOGOS` came from a design mockup. They are
 * invented. Zisriq has no users yet, so publishing them would be a false claim
 * to prospective customers — and in India, misleading advertising is actionable
 * under the Consumer Protection Act, with ASCI guidelines applying on top.
 *
 * They are gathered here, behind `SHOW_SOCIAL_PROOF`, so they cannot reach a
 * public site by accident. Turn it on only once every number is real and every
 * firm named has agreed in writing to be named.
 */

/** Off until the numbers are true. See the warning above. */
export const SHOW_SOCIAL_PROOF = false;

export type Stat = { value: string; label: string };

/** PLACEHOLDER — replace with measured figures before enabling. */
export const STATS: Stat[] = [
  { value: "50+", label: "CA firms" },
  { value: "10,000+", label: "Documents collected" },
  { value: "95%", label: "Faster follow-ups" },
];

/** PLACEHOLDER — needs a real, attributable, written-consent quote. */
export const TESTIMONIAL = {
  quote:
    "Zisriq has transformed how we collect documents from our clients. No more endless chasing on WhatsApp!",
  attribution: "CA Rohan Mehta, Mehta & Associates",
};

/** PLACEHOLDER — never show a firm's name or mark without permission. */
export const CLIENT_LOGOS = ["S R & Co.", "Mehta & Associates", "Sharma Jain & Co."];

// --------------------------------------------------------------------------
// The rest is factual: it describes what the product actually does today.
// --------------------------------------------------------------------------

export type Feature = {
  /** Lucide icon name, resolved by the component that renders it. */
  icon: "link" | "list" | "bell" | "shield";
  title: string;
  body: string;
};

export const FEATURES: Feature[] = [
  {
    icon: "link",
    title: "Simple for clients",
    body: "No login. No app. Just a secure link they open on their phone.",
  },
  {
    icon: "list",
    title: "Stay on top",
    body: "See what is missing, from whom, and for how long.",
  },
  {
    icon: "bell",
    title: "Automatic reminders",
    body: "Zisriq chases on a schedule you set, and stops when the client delivers.",
  },
  {
    icon: "shield",
    title: "Secure by design",
    body: "Upload links expire, are single-use, and are stored only as a hash.",
  },
];

export type Step = { title: string; body: string };

export const STEPS: Step[] = [
  {
    title: "Build a checklist",
    body: "Reuse a template, or list exactly what this client needs to send for this period.",
  },
  {
    title: "Send one link",
    body: "The client opens it on their phone and uploads. No account, no password, no app.",
  },
  {
    title: "Watch it close itself",
    body: "Zisriq tracks what has arrived, chases what has not, and tells you what is blocked.",
  },
];

/** Shown along the bottom. Each of these is true of the product as built. */
export const TRUST_POINTS = [
  "Row-level security on every table",
  "Built for CA firms",
  "No client login needed",
  "Reminders run on their own",
];
