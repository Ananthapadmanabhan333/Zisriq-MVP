"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, CalendarDays, Eye, EyeOff, Lock, Mail } from "lucide-react";

import { FormBanner } from "@/components/ui/field";
import { login } from "@/server/actions/auth";

/**
 * The sign-in card on the landing page.
 *
 * A light island on the dark page — the contrast is what makes it read as the
 * one thing to act on. It posts to the same `login` action as /login, so there
 * is one authentication path rather than two that can drift.
 *
 * Colocated with the page rather than living in src/components because it calls
 * a server action. ESLint forbids src/components from importing @/server at all,
 * which is the right default: components should be presentational and take data
 * as props. Action-calling clients belong next to the route that owns them.
 */
export function SignInCard({ next = "/dashboard" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, null);
  const [revealed, setRevealed] = useState(false);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <div className="light bg-card text-foreground w-full rounded-3xl p-8 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-center gap-2.5">
        <span
          className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl text-xl font-bold"
          aria-hidden
        >
          Z
        </span>
        <span className="text-[19px] font-semibold tracking-[0.18em]">ZISRIQ</span>
      </div>

      <h2 className="mt-6 text-center text-[26px] font-semibold tracking-tight">Welcome back</h2>
      <p className="text-muted-foreground mt-1.5 text-center text-[15px]">
        Sign in to your firm&apos;s workspace
      </p>

      <form action={formAction} className="mt-6 space-y-3">
        <input type="hidden" name="next" value={next} />

        {state && !state.ok && !state.fieldErrors ? (
          <FormBanner tone="error">{state.message}</FormBanner>
        ) : null}

        <div className="relative">
          <Mail
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2"
            aria-hidden
          />
          <input
            id="landing-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-label="Email"
            aria-invalid={Boolean(errors?.email) || undefined}
            placeholder="you@yourfirm.com"
            className="bg-secondary ring-border placeholder:text-muted-foreground focus:ring-ring h-14 w-full rounded-2xl pr-4 pl-12 text-[15px] ring-1 outline-none focus:ring-2"
          />
        </div>
        {errors?.email ? <p className="text-destructive text-sm">{errors.email[0]}</p> : null}

        <div className="relative">
          <Lock
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2"
            aria-hidden
          />
          <input
            id="landing-password"
            name="password"
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-label="Password"
            placeholder="Password"
            className="bg-secondary ring-border placeholder:text-muted-foreground focus:ring-ring h-14 w-full rounded-2xl pr-12 pl-12 text-[15px] ring-1 outline-none focus:ring-2"
          />
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 transition-colors"
          >
            {revealed ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>

        {/* The mockup had a "Remember me" checkbox. It is deliberately not here.
            Honouring it means shortening the session cookie when unticked, which
            @supabase/ssr sets in the client factory, not in this action — so the
            control would have done nothing. Someone unticking it on a shared
            office machine would believe they were protected when they were not,
            and a security control that lies is worse than no control. Add it back
            with the cookie plumbing, or not at all. */}
        <div className="flex justify-end pt-1">
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-[14px]"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-colors disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
          {!pending ? <ArrowRight className="size-4" aria-hidden /> : null}
        </button>
      </form>

      <div className="border-border mt-7 border-t pt-6">
        <div className="bg-secondary flex items-start gap-3.5 rounded-2xl p-4">
          <span
            className="bg-card ring-border flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
            aria-hidden
          >
            <CalendarDays className="text-muted-foreground size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-medium">New to Zisriq?</p>
            <p className="text-muted-foreground mt-0.5 text-[14px]">
              Create your firm&apos;s workspace in a minute.
            </p>
            <Link
              href="/sign-up"
              className="mt-1.5 inline-flex items-center gap-1.5 text-[14px] font-medium text-blue-700 hover:underline"
            >
              Get started
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
