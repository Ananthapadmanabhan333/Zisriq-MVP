/**
 * Server-only environment access.
 *
 * The `server-only` import makes any client component that reaches for this
 * module fail the build rather than leaking a secret into the browser bundle.
 */
import "server-only";
import { parseServerEnv, type ServerEnv } from "@/lib/env/schema";

const placeholder: ServerEnv = {
  SUPABASE_SERVICE_ROLE_KEY: "skipped-env-validation-placeholder",
  SUPABASE_JWT_SECRET: "skipped-env-validation-placeholder",
  APP_URL: "http://localhost:3000",
  NODE_ENV: "production",
};

export const serverEnv: ServerEnv =
  process.env.SKIP_ENV_VALIDATION === "1"
    ? placeholder
    : parseServerEnv(process.env as Record<string, string | undefined>);

/** True when email should go to the console transport instead of Resend. */
export const isEmailPreviewMode = () =>
  serverEnv.NODE_ENV !== "production" || !serverEnv.RESEND_API_KEY;
