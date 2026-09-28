/** Values in this module are the only Supabase values permitted in browser code. */
export const supabasePublicConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;

export function hasSupabasePublicConfig() {
  return Boolean(supabasePublicConfig.url && supabasePublicConfig.publishableKey);
}
