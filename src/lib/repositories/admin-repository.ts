import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContactSubmissionStatus, ContentKind, ContentStatus } from "@/types/database";

const adminPageSize = 25;

export async function getDashboardOverview({ includeAnalytics, includeConsultations }: { includeAnalytics: boolean; includeConsultations: boolean }) {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startDate = sevenDaysAgo.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const [drafts, published, recentPosts, todayViews, weekViews, newConsultations, recentConsultations] = await Promise.all([
    supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("content_posts").select("id, title, kind, status, updated_at").order("updated_at", { ascending: false }).limit(5),
    includeAnalytics ? supabase.from("analytics_daily").select("page_views").eq("event_date", today) : Promise.resolve({ data: [], error: null }),
    includeAnalytics ? supabase.from("analytics_daily").select("page_views").gte("event_date", startDate) : Promise.resolve({ data: [], error: null }),
    includeConsultations ? supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("status", "new") : Promise.resolve({ count: 0, error: null }),
    includeConsultations ? supabase.from("contact_submissions").select("id, name, email, status, submitted_at").order("submitted_at", { ascending: false }).limit(5) : Promise.resolve({ data: [], error: null }),
  ]);
  if (drafts.error || published.error || recentPosts.error || todayViews.error || weekViews.error || newConsultations.error || recentConsultations.error) throw new Error("Could not load dashboard data.");
  return {
    drafts: drafts.count ?? 0,
    published: published.count ?? 0,
    recentPosts: recentPosts.data,
    todayViews: todayViews.data.reduce((total, row) => total + row.page_views, 0),
    weekViews: weekViews.data.reduce((total, row) => total + row.page_views, 0),
    newConsultations: newConsultations.count ?? 0,
    recentConsultations: recentConsultations.data,
  };
}

export async function listAdminPosts(filters: { kind?: ContentKind; query?: string; status?: ContentStatus } = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("content_posts")
    .select("id, kind, slug, title, status, published_at, updated_at, author_id")
    .order("updated_at", { ascending: false })
    .limit(adminPageSize);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.query) query = query.or(`title.ilike.%${filters.query.replace(/[,%]/g, "")}%,slug.ilike.%${filters.query.replace(/[,%]/g, "")}%`);
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

export async function listConsultations(filters: { query?: string; status?: ContactSubmissionStatus } = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("contact_submissions")
    .select("id, name, email, phone, status, submitted_at, assigned_to")
    .order("submitted_at", { ascending: false })
    .limit(adminPageSize);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.query) {
    const value = filters.query.replace(/[,%]/g, "");
    query = query.or(`name.ilike.%${value}%,email.ilike.%${value}%`);
  }
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
  const dateAtOffset = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  };
  const startDate = dateAtOffset(-(days - 1));
  const previousStartDate = dateAtOffset(-(days * 2 - 1));
  const [{ data: analytics, error: analyticsError }, { count: contactCount, error: contactsError }] = await Promise.all([
    supabase.from("analytics_daily").select("event_date, path, page_views, updated_at").gte("event_date", previousStartDate).order("event_date", { ascending: true }),
    supabase.from("contact_submissions").select("id", { count: "exact", head: true }).gte("submitted_at", `${startDate}T00:00:00-03:00`),
  ]);
  if (analyticsError || contactsError) throw new Error("Could not load analytics.");
  const current = analytics.filter((row) => row.event_date >= startDate);
  const previous = analytics.filter((row) => row.event_date < startDate);
  const dailyPoints = Array.from({ length: days }, (_, index) => {
    const date = dateAtOffset(-(days - 1) + index);
    return { date, value: current.filter((row) => row.event_date === date).reduce((total, row) => total + row.page_views, 0) };
  });
  const topPages = [...current.reduce((map, row) => map.set(row.path, (map.get(row.path) ?? 0) + row.page_views), new Map<string, number>())]
    .map(([path, pageViews]) => ({ path, pageViews }))
    .sort((a, b) => b.pageViews - a.pageViews)
    .slice(0, 10);
  return {
    analytics: current,
    contactCount: contactCount ?? 0,
    dailyPoints,
    previousViews: previous.reduce((total, row) => total + row.page_views, 0),
    startDate,
    topPages,
  };
}

export async function listStaffUsers() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("admin_users").select("user_id, role, is_active, created_at, updated_at").order("created_at");
  if (error) throw new Error("Could not load staff users.");
  return data;
}

export async function listStaffUsersWithIdentity() {
  const staff = await listStaffUsers();
  const adminClient = createAdminSupabaseClient();
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error("Could not load staff identities.");
  const identities = new Map(data.users.map((user) => [user.id, user]));
  return staff.map((member) => {
    const identity = identities.get(member.user_id);
    const displayName = typeof identity?.user_metadata?.full_name === "string" ? identity.user_metadata.full_name.trim() : "";
    return {
      ...member,
      displayName: displayName || identity?.email?.split("@")[0] || "Cuenta administrativa",
      email: identity?.email ?? null,
      lastSignInAt: identity?.last_sign_in_at ?? null,
    };
  });
}
