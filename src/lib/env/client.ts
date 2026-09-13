/**
 * Browser-safe environment access.
 *
 * NEXT_PUBLIC_* variables are inlined by Next at build time, which only works
 * when they are referenced as literal property accesses — so they are spelled
 * out here rather than read dynamically from `process.env`.
 */
import { parseClientEnv, type ClientEnv } from "./schema";

const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

const placeholder: ClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "skipped-env-validation-placeholder",
};

export const clientEnv: ClientEnv =
  process.env.SKIP_ENV_VALIDATION === "1" ? placeholder : parseClientEnv(raw);
