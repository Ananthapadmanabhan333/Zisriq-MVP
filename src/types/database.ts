/**
 * Generated Supabase types.
 *
 * Regenerate with `npm run db:types` after every migration. Checked in so that
 * CI can typecheck without a running database.
 *
 * Placeholder until Phase 1 introduces the schema.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
