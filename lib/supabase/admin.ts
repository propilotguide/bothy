import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceKey, supabaseUrl } from "@/lib/env";

/**
 * Service-role client. Bypasses row level security, so only use it in the
 * Shortcuts endpoints, after the bearer token has been matched to a user,
 * and always filter by that user's id.
 */
export function createAdminClient() {
  return createClient(
    supabaseUrl(),
    supabaseServiceKey(),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
