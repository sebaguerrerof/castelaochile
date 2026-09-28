import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { RuntimeConfigurationError } from "@/lib/runtime-config";
import { hasSupabasePublicConfig, supabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  if (!hasSupabasePublicConfig()) throw new RuntimeConfigurationError("Supabase");
  const cookieStore = await cookies();
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
