import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContactSubmissionStatus, ContentKind } from "@/types/database";

const adminPageSize = 25;

export async function getDashboardCounts() {
  const supabase = await createServerSupabaseClient();
  const [drafts, newConsultations, todayViews] = await Promise.all([
    supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("analytics_daily").select("page_views").eq("event_date", new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" })),
  ]);
  if (drafts.error || newConsultations.error || todayViews.error) throw new Error("Could not load dashboard data.");
  return {
    drafts: drafts.count ?? 0,
    newConsultations: newConsultations.count ?? 0,
    todayViews: todayViews.data.reduce((total, row) => total + row.page_views, 0),
  };
}

export async function listAdminPosts(kind?: ContentKind) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("content_posts")
    .select("id, kind, slug, title, status, published_at, updated_at, author_id")
    .order("updated_at", { ascending: false })
    .limit(adminPageSize);
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  if (error) throw new Error("Could not load content.");
  return data;
}

export async function getAdminPost(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("content_posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load content.");
  return data;
}

export async function listConsultations(status?: ContactSubmissionStatus) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("contact_submissions")
    .select("id, name, email, phone, status, submitted_at, assigned_to")
    .order("submitted_at", { ascending: false })
    .limit(adminPageSize);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error("Could not load consultations.");
  return data;
}

export async function getConsultation(id: string) {
  const supabase = await createServerSupabaseClient();
  const [submission, notes] = await Promise.all([
    supabase.from("contact_submissions").select("*").eq("id", id).maybeSingle(),
    supabase.from("contact_notes").select("*").eq("submission_id", id).order("created_at", { ascending: true }),
  ]);
  if (submission.error || notes.error) throw new Error("Could not load the consultation.");
  return { submission: submission.data, notes: notes.data };
}

export async function getAnalytics(days: number) {
  const supabase = await createServerSupabaseClient();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const startDate = start.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const [{ data: analytics, error: analyticsError }, { count: contactCount, error: contactsError }] = await Promise.all([
    supabase.from("analytics_daily").select("event_date, path, page_views, updated_at").gte("event_date", startDate).order("event_date", { ascending: true }),
    supabase.from("contact_submissions").select("id", { count: "exact", head: true }).gte("submitted_at", `${startDate}T00:00:00-03:00`),
  ]);
  if (analyticsError || contactsError) throw new Error("Could not load analytics.");
  return { analytics, contactCount: contactCount ?? 0, startDate };
}

export async function listStaffUsers() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("admin_users").select("user_id, role, is_active, created_at, updated_at").order("created_at");
  if (error) throw new Error("Could not load staff users.");
  return data;
}
