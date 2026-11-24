import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { RuntimeConfigurationError } from "@/lib/runtime-config";
import { hasSupabasePublicConfig, supabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  // Read cookies first: it marks the route as dynamic even when Supabase is not configured, so a build
  // without environment variables (CI) does not try to prerender pages that need the database.
  const cookieStore = await cookies();
  if (!hasSupabasePublicConfig()) throw new RuntimeConfigurationError("Supabase");
  return createServerClient<Database>(supabasePublicConfig.url!, supabasePublicConfig.publishableKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Proxy persists refreshed cookies during RSC rendering. */ }
      },
    },
  });
}
