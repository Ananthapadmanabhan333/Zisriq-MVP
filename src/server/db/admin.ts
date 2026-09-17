import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { serverEnv } from "@/server/env";
import { clientEnv } from "@/lib/env/client";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. **This bypasses RLS entirely.**
 *
 * Only three callers are legitimate, and each is a case where there is no user
 * session to carry authorisation:
 *
 *   1. the reminder cron, which acts for every firm at once;
 *   2. upload confirmation, which writes a document row on behalf of a client
 *      who is authenticated by a portal token rather than a Supabase session;
 *   3. portal scope resolution, which exchanges a token for a request id.
 *
 * Anything with a logged-in user must use `@/lib/supabase/server` instead, so
 * that RLS applies. If you are reaching for this to "make a query work", the
 * query is wrong.
 *
 * Sessions are deliberately not persisted: this client must never pick up a
 * user's cookie and act as them.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
