import {
  CircleAlert,
  CircleDot,
  Clock,
  FileText,
  History,
  LayoutDashboard,
  Settings,
  Upload,
  Users,
  UsersRound,
} from "lucide-react";

/**
 * The product shot: a tablet showing the firm's dashboard, a phone showing what
 * the client sees.
 *
 * Drawn in CSS from the same design tokens as the real app rather than shipped
 * as a screenshot. It stays sharp at any density, adds no image weight, costs no
 * layout shift, and — the reason that actually matters — it cannot drift out of
 * date the way a screenshot silently does the moment the UI changes.
 *
 * Purely decorative: the whole thing is hidden from assistive technology, since
 * every claim it makes is stated in real text beside it.
 */

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: CircleDot, label: "Requests" },
  { icon: Users, label: "Clients" },
  { icon: FileText, label: "Templates" },
  { icon: UsersRound, label: "Members" },
  { icon: History, label: "Activity" },
  { icon: Settings, label: "Settings" },
];

const STATS = [
  { icon: FileText, value: "128", label: "Total Requests", tone: "text-muted-foreground" },
  { icon: Clock, value: "74", label: "Awaiting Client", tone: "text-awaiting" },
  { icon: CircleAlert, value: "19", label: "Overdue", tone: "text-overdue" },
];

const LEGEND = [
  { count: "86", label: "Received", color: "var(--received)" },
  { count: "74", label: "Awaiting client", color: "var(--awaiting)" },
  { count: "19", label: "Overdue", color: "var(--overdue)" },
  { count: "31", label: "Under review", color: "var(--review)" },
];

const ATTENTION = [
  {
    name: "Rahul Sharma",
    meta: "ITR — Salaried · FY 2024–25",
    count: "8 / 12",
    pct: 66,
    rail: "bg-overdue",
  },
  {
    name: "Priya Nair",
    meta: "ITR — Salaried · FY 2024–25",
    count: "10 / 12",
    pct: 83,
    rail: "bg-primary",
  },
  {
    name: "ABC Pvt Ltd",
    meta: "GST Documents · Jul 2024",
    count: "5 / 9",
    pct: 55,
    rail: "bg-overdue/70",
  },
];

const CHECKLIST = [
  { label: "PAN Card", state: "Uploaded", done: true },
  { label: "Aadhaar", state: "Uploaded", done: true },
  { label: "Form 16", state: "Uploaded", done: true },
  { label: "Investment Proof", state: "Pending", done: false },
  { label: "Rent Receipt", state: "Pending", done: false },
];

function Donut({ percent, label }: { percent: number; label: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="relative shrink-0">
      <svg width="68" height="68" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="6" />
        <circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 34 34)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[13px] leading-none font-semibold">{percent}%</span>
        <span className="text-muted-foreground mt-0.5 text-[6px] leading-tight">{label}</span>
      </div>
    </div>
  );
}

export function DevicePreview() {
  return (
    <div className="relative select-none" aria-hidden>
      {/* Warm light falling from behind the devices, in place of the studio
          lighting a rendered product shot would have. */}
      <div
        className="pointer-events-none absolute -inset-16 -z-10"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 38%, oklch(0.55 0.08 72 / 0.42) 0%, transparent 70%)",
        }}
      />

      {/* Tablet */}
      <div className="bg-secondary ring-border/70 rounded-[26px] p-2.5 shadow-2xl ring-1 shadow-black/60">
        <div className="bg-background overflow-hidden rounded-[18px]">
          <div className="flex">
            {/* Sidebar */}
            <div className="bg-sidebar border-sidebar-border w-[104px] shrink-0 border-r p-3">
              <div className="flex items-center gap-1.5">
                <span className="bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-[5px] text-[9px] font-bold">
                  Z
                </span>
                <span className="text-[9px] font-semibold tracking-[0.16em]">ZISRIQ</span>
              </div>

              <div className="mt-4 space-y-1">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[8px] ${
                        item.active
                          ? "bg-sidebar-accent text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Icon className={`size-2.5 ${item.active ? "text-primary" : ""}`} />
                      {item.label}
                    </div>
                  );
                })}
              </div>

              <div className="bg-card ring-border/60 mt-5 flex items-center gap-1.5 rounded-lg p-1.5 ring-1">
                <span className="bg-secondary flex size-4 items-center justify-center rounded-full text-[7px] font-semibold">
                  AP
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[7px] font-medium">Anantha P.</span>
                  <span className="text-muted-foreground block truncate text-[6px]">
                    ACME & Co.
                  </span>
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="min-w-0 flex-1 p-3">
              <div className="bg-card ring-border/60 flex items-center gap-1.5 rounded-lg px-2 py-1.5 ring-1">
                <span className="text-muted-foreground text-[8px]">Search clients, requests…</span>
                <span className="text-muted-foreground ml-auto text-[7px]">⌘K</span>
              </div>

              <div className="bg-card ring-border/60 mt-2 rounded-lg p-2.5 ring-1">
                <p className="text-muted-foreground text-[7px]">Friday, 18 September 2026</p>
                <p className="mt-1 text-[13px] leading-tight font-semibold">
                  Good morning, Anantha 👋
                </p>
                <p className="text-muted-foreground mt-1 text-[7px]">
                  19 requests need your attention today.
                </p>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {STATS.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="bg-card ring-border/60 rounded-lg p-2 ring-1">
                      <Icon className={`size-2.5 ${stat.tone}`} />
                      <p className="mt-1.5 text-[13px] leading-none font-semibold">{stat.value}</p>
                      <p className="text-muted-foreground mt-1 text-[7px]">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              <div className="bg-card ring-border/60 mt-2 rounded-lg p-2.5 ring-1">
                <p className="text-[9px] font-semibold">Collection Progress</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <Donut percent={78} label="Documents collected" />
                  <ul className="flex-1 space-y-1">
                    {LEGEND.map((row) => (
                      <li key={row.label} className="flex items-center gap-1.5">
                        <span
                          className="size-1 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="w-4 text-right text-[7px] font-semibold">{row.count}</span>
                        <span className="text-muted-foreground text-[7px]">{row.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="mt-2 text-[9px] font-semibold">Needs Your Attention</p>
              <div className="mt-1.5 space-y-1.5">
                {ATTENTION.map((row) => (
                  <div
                    key={row.name}
                    className="bg-card ring-border/60 relative flex items-center gap-2 overflow-hidden rounded-lg py-1.5 pr-2 pl-2.5 ring-1"
                  >
                    <span className={`absolute inset-y-0 left-0 w-[3px] ${row.rail}`} />
                    <span className="bg-secondary size-4 shrink-0 rounded-full" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[7px] font-medium">{row.name}</span>
                      <span className="text-muted-foreground block truncate text-[6px]">
                        {row.meta}
                      </span>
                    </span>
                    <span className="w-14 shrink-0">
                      <span className="text-muted-foreground block text-[6px]">{row.count}</span>
                      <span className="bg-secondary mt-0.5 block h-[3px] overflow-hidden rounded-full">
                        <span
                          className="bg-primary block h-full rounded-full"
                          style={{ width: `${row.pct}%` }}
                        />
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone, overlapping the tablet — the client's side of the same request. */}
      <div className="absolute -right-6 -bottom-10 w-[168px] sm:-right-12">
        <div className="bg-secondary ring-border/70 rounded-[24px] p-2 shadow-2xl ring-1 shadow-black/70">
          <div className="bg-background overflow-hidden rounded-[18px] p-3">
            <div className="flex items-center gap-1.5">
              <span className="bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-[5px] text-[9px] font-bold">
                Z
              </span>
              <span className="text-[9px] font-semibold tracking-[0.16em]">ZISRIQ</span>
            </div>

            <div className="mt-3 flex justify-center">
              <Donut percent={60} label="Documents uploaded" />
            </div>

            <ul className="mt-3 space-y-1.5">
              {CHECKLIST.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <span
                    className={`flex size-3.5 shrink-0 items-center justify-center rounded-full ${
                      item.done ? "bg-received/20" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        item.done ? "bg-received" : "bg-muted-foreground/50"
                      }`}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[7px] font-medium">{item.label}</span>
                    <span className="text-muted-foreground block text-[6px]">{item.state}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="bg-primary text-primary-foreground mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[8px] font-semibold">
              <Upload className="size-2.5" />
              Upload document
            </div>

            <p className="text-muted-foreground mt-2 text-center text-[6px]">No login needed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
