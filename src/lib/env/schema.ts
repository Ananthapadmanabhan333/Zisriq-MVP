/**
 * Environment schemas.
 *
 * This module is deliberately side-effect free and contains no secrets — it only
 * describes their *shape*, so it is safe to import from tests and from either
 * runtime. Actual parsing happens in `./client.ts` (browser-safe) and
 * `@/server/env` (server-only).
 */
import { z } from "zod";

/** Variables inlined into the client bundle. Nothing secret may live here. */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("must be an absolute URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "looks too short to be a key"),
});

const requiredSecret = (label: string) => z.string().min(16, `${label} looks too short`);

/** Variables that must never reach the browser. */
export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: requiredSecret("service role key"),
  SUPABASE_JWT_SECRET: requiredSecret("JWT secret"),
  APP_URL: z
    .url("must be an absolute URL")
    .refine((v) => !v.endsWith("/"), "must not have a trailing slash"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Optional until the phase that needs them. Empty string is treated as absent
  // so that a blank line in .env.local does not fail validation.
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.string().min(1).optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Treat empty strings as missing, so blank .env entries behave like absent ones. */
export function blankToUndefined(raw: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, v === "" ? undefined : v]),
  ) as Record<string, string | undefined>;
}

export class EnvValidationError extends Error {
  constructor(scope: "client" | "server", issues: z.core.$ZodIssue[]) {
    const detail = issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    super(
      `Invalid ${scope} environment variables:\n${detail}\n\n` +
        `Copy .env.example to .env.local and fill in the missing values.`,
    );
    this.name = "EnvValidationError";
  }
}

export function parseClientEnv(raw: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(blankToUndefined(raw));
  if (!result.success) throw new EnvValidationError("client", result.error.issues);
  return result.data;
}

export function parseServerEnv(raw: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(blankToUndefined(raw));
  if (!result.success) throw new EnvValidationError("server", result.error.issues);
  return result.data;
}
