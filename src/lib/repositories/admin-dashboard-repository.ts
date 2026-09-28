import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getEditorialDashboardCounts() {
  const supabase = await createServerSupabaseClient();
  const [drafts, todayViews] = await Promise.all([
    supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("analytics_daily").select("page_views").eq("event_date", new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" })),
  ]);
  if (drafts.error || todayViews.error) throw new Error("Could not load dashboard data.");
  return { drafts: drafts.count ?? 0, todayViews: todayViews.data.reduce((total, row) => total + row.page_views, 0) };
}
