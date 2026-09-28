import "server-only";

import { createClient } from "@supabase/supabase-js";

import { hasSupabaseSecretConfig, RuntimeConfigurationError, runtimeConfig } from "@/lib/runtime-config";
import { supabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

/** Bypasses RLS only for explicitly scoped server-side operations. */
export function createAdminSupabaseClient() {
  if (!hasSupabaseSecretConfig()) throw new RuntimeConfigurationError("Supabase server key");
  return createClient<Database>(supabasePublicConfig.url!, runtimeConfig.supabaseSecretKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
