"use client";

import { createBrowserClient } from "@supabase/ssr";

import { hasSupabasePublicConfig, supabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createBrowserSupabaseClient() {
  if (!hasSupabasePublicConfig()) throw new Error("Supabase Auth is not configured.");
  browserClient ??= createBrowserClient<Database>(supabasePublicConfig.url!, supabasePublicConfig.publishableKey!);
  return browserClient;
}
