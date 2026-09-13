/**
 * Test harness for integration tests that run against a real local Supabase.
 *
 * These tests authenticate as genuine seeded users and exercise RLS exactly as
 * the application will: anon key + user JWT, never the service role. The service
 * role client is used only for setup and for reading back ground truth, and is
 * clearly named so that its use is obvious in a diff.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Fixed identifiers from supabase/seed.sql. */
export const SEED = {
  firmA: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Deshmukh & Associates",
    admin: { email: "priya@deshmukhca.example", id: "a0000001-0000-4000-8000-000000000001" },
    accountant: { email: "rahul@deshmukhca.example", id: "a0000001-0000-4000-8000-000000000002" },
    staff: { email: "sneha@deshmukhca.example", id: "a0000001-0000-4000-8000-000000000003" },
    clientId: "c1000001-0000-4000-8000-000000000001",
    requestId: "81000001-0000-4000-8000-000000000001",
    templateId: "71000001-0000-4000-8000-000000000001",
    // Assigned to `staff`; used to prove staff scoping.
    requestAssignedToStaff: "81000001-0000-4000-8000-000000000001",
    // Assigned to the accountant, so staff must NOT see it.
    requestNotAssignedToStaff: "81000001-0000-4000-8000-000000000003",
  },
  firmB: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Iyer Venkatraman & Co.",
    admin: { email: "venkat@iyervenkat.example", id: "b0000002-0000-4000-8000-000000000001" },
    accountant: { email: "lakshmi@iyervenkat.example", id: "b0000002-0000-4000-8000-000000000002" },
    clientId: "c2000002-0000-4000-8000-000000000001",
    requestId: "82000002-0000-4000-8000-000000000001",
    templateId: "72000002-0000-4000-8000-000000000001",
  },
  password: "Password123!",
} as const;

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Bypasses RLS. Setup and ground-truth reads only — never to assert access. */
export function serviceRoleClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signIn(email: string): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: SEED.password,
  });
  if (error) {
    throw new Error(
      `could not sign in as ${email}: ${error.message}. ` +
        `Is the local stack running and seeded? (npm run db:reset)`,
    );
  }
  return client;
}

/** True when a local Supabase is reachable, so suites can fail loudly but early. */
export async function supabaseIsReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY },
      signal: AbortSignal.timeout(3000),
    });
    return response.status < 500;
  } catch {
    return false;
  }
}
