import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Link2,
  ListChecks,
  Quote,
  Shield,
  type LucideIcon,
} from "lucide-react";

import { DevicePreview } from "@/components/marketing/device-preview";
import { SignInCard } from "./sign-in-card";
import {
  CLIENT_LOGOS,
  FEATURES,
  SHOW_SOCIAL_PROOF,
  STATS,
  STEPS,
  TESTIMONIAL,
  TRUST_POINTS,
} from "@/lib/marketing";
import { getSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Zisriq — stop chasing clients for documents",
  description:
    "Zisriq helps CA and accounting firms request, collect and track client documents in one place. Clients upload through a secure link — no login, no app.",
};

const ICONS: Record<string, LucideIcon> = {
  link: Link2,
  list: ListChecks,
  bell: Bell,
  shield: Shield,
};

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
];

export default async function LandingPage() {
  // Someone already signed in has no use for the pitch.
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="dark bg-background text-foreground min-h-screen">
      <header className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span
            className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl text-xl font-bold"
            aria-hidden
          >
            Z
          </span>
          <span className="text-[19px] font-semibold tracking-[0.18em]">ZISRIQ</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground text-[15px] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-muted-foreground hidden text-[15px] lg:inline">
            Don&apos;t have an account?
          </span>
          <Link
            href="/sign-up"
            className="ring-border hover:bg-secondary rounded-full px-6 py-3 text-[15px] font-medium ring-1 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      <main>
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto grid max-w-[1400px] items-start gap-12 px-6 pt-6 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_400px] lg:gap-8 lg:px-10">
          <div className="min-w-0">
            <p className="bg-secondary/80 ring-border/60 inline-flex rounded-full px-4 py-2 text-[12px] font-medium tracking-[0.12em] uppercase ring-1">
              Document collection for CA firms
            </p>

            <h1 className="mt-7 text-[clamp(2.5rem,5vw,3.5rem)] leading-[1.05] font-bold tracking-tight">
              Stop chasing clients
              <br />
              for <span className="text-primary">documents.</span>
            </h1>

            <p className="text-muted-foreground mt-6 max-w-[46ch] text-[17px] leading-relaxed">
              Zisriq helps CA and accounting firms request, collect and track client documents — all
              in one place.
            </p>

            <ul className="mt-10 space-y-6">
              {FEATURES.map((feature) => {
                const Icon = ICONS[feature.icon];
                return (
                  <li key={feature.title} className="flex gap-4">
                    <span
                      className="bg-secondary ring-border/60 flex size-11 shrink-0 items-center justify-center rounded-xl ring-1"
                      aria-hidden
                    >
                      <Icon className="text-primary size-[19px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[16px] font-semibold">{feature.title}</span>
                      <span className="text-muted-foreground mt-1 block text-[15px]">
                        {feature.body}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {SHOW_SOCIAL_PROOF ? (
              <>
                <dl className="mt-12 flex flex-wrap gap-10">
                  {STATS.map((stat) => (
                    <div key={stat.label}>
                      <dt className="sr-only">{stat.label}</dt>
                      <dd>
                        <span className="block text-[28px] leading-none font-bold">
                          {stat.value}
                        </span>
                        <span className="text-muted-foreground mt-2 block text-[14px]">
                          {stat.label}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>

                <figure className="bg-card/70 ring-border/50 mt-12 rounded-2xl p-6 ring-1">
                  <Quote className="text-muted-foreground size-5" aria-hidden />
                  <blockquote className="mt-3 text-[15px] leading-relaxed">
                    {TESTIMONIAL.quote}
                  </blockquote>
                  <figcaption className="text-muted-foreground mt-3 text-[14px]">
                    — {TESTIMONIAL.attribution}
                  </figcaption>
                </figure>
              </>
            ) : null}
          </div>

          <div className="mt-6 min-w-0 lg:mt-14">
            <DevicePreview />
          </div>

          <div className="lg:sticky lg:top-8">
            <SignInCard />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section id="how-it-works" className="border-border/50 border-t py-24">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-tight">
              Three steps, then it runs itself
            </h2>

            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="bg-card ring-border/60 rounded-2xl p-7 ring-1">
                  <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl font-semibold">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-[18px] font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground mt-2.5 text-[15px] leading-relaxed">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section id="features" className="border-border/50 border-t py-24">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-tight">
              Built around how a firm actually works
            </h2>
            <p className="text-muted-foreground mt-4 max-w-[60ch] text-[17px] leading-relaxed">
              Not an accounting system. Zisriq does one job — getting documents out of clients and
              onto your desk — and tries to do it without adding work.
            </p>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {FEATURES.map((feature) => {
                const Icon = ICONS[feature.icon];
                return (
                  <div
                    key={feature.title}
                    className="bg-card ring-border/60 rounded-2xl p-7 ring-1"
                  >
                    <span
                      className="bg-secondary flex size-11 items-center justify-center rounded-xl"
                      aria-hidden
                    >
                      <Icon className="text-primary size-5" />
                    </span>
                    <h3 className="mt-5 text-[18px] font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground mt-2.5 text-[15px] leading-relaxed">
                      {feature.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section id="security" className="border-border/50 border-t py-24">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-tight">
              Your clients&apos; records, handled carefully
            </h2>
            <p className="text-muted-foreground mt-4 max-w-[62ch] text-[17px] leading-relaxed">
              Every document in Zisriq is someone&apos;s financial record. Separation between firms
              is enforced by the database itself, not by application code that can be bypassed.
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-3 text-[15px]">
                  <CheckCircle2 className="text-received size-5 shrink-0" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section className="border-border/50 border-t py-24">
          <div className="mx-auto max-w-[1400px] px-6 text-center lg:px-10">
            <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-tight">
              Get your next filing season back
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-[48ch] text-[17px]">
              Set up your firm and send your first request in a few minutes.
            </p>
            <Link
              href="/sign-up"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 inline-flex rounded-xl px-8 py-4 text-[15px] font-semibold transition-colors"
            >
              Create your workspace
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-border/50 border-t py-10">
        <div className="text-muted-foreground mx-auto flex max-w-[1400px] flex-wrap items-center gap-6 px-6 text-[14px] lg:px-10">
          <span className="flex items-center gap-2.5">
            <span
              className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-sm font-bold"
              aria-hidden
            >
              Z
            </span>
            Zisriq
          </span>

          {SHOW_SOCIAL_PROOF ? (
            <span className="ml-auto flex flex-wrap items-center gap-6">
              <span>Trusted by forward-looking firms across India</span>
              {CLIENT_LOGOS.map((firm) => (
                <span key={firm} className="opacity-60">
                  {firm}
                </span>
              ))}
            </span>
          ) : (
            <Link href="/login" className="hover:text-foreground ml-auto">
              Sign in
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
