import "server-only";

import { isBlogSchemaUnavailable } from "@/lib/blog/schema-compatibility";
import { hasSupabasePublicConfig } from "@/lib/runtime-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentKind, ContentOrigin } from "@/types/database";

export type PublicPostSummary = {
  id: string; kind: ContentKind; slug: string; title: string; summary: string;
  coverImagePath: string | null; coverAlt: string | null; authorName: string | null;
  publishedAt: string; updatedAt: string; readingTimeMinutes: number | null;
  origin: ContentOrigin; categories: Array<{ name: string; slug: string }>;
};

export type PublicPost = PublicPostSummary & {
  body: string; contentHtml: string | null; seoTitle: string | null;
  seoDescription: string | null; sourceUrl: string | null;
};

export type PostPage = { posts: PublicPostSummary[]; nextCursor: string | null };
export type BlogPage = { posts: PublicPostSummary[]; page: number; pageSize: number; total: number; totalPages: number };
export type BlogCategory = { id: string; name: string; slug: string; postCount: number };

const pageSize = 12;
const cursorPattern = /^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+-]+Z)\.([0-9a-f-]{36})$/i;

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return null;
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  const match = cursorPattern.exec(decoded);
  if (!match || Number.isNaN(Date.parse(match[1]))) return null;
  return { publishedAt: match[1], id: match[2] };
}

function encodeCursor(post: PublicPostSummary) {
  return Buffer.from(`${post.publishedAt}.${post.id}`).toString("base64url");
}

function mapSummary(row: {
  id: string; kind: ContentKind; slug: string; title: string; summary: string;
  cover_image_path: string | null; cover_alt: string | null; author_name?: string | null;
  published_at: string | null; updated_at: string; reading_time_minutes?: number | null;
  origin?: ContentOrigin; category_names?: string[]; category_slugs?: string[];
}): PublicPostSummary {
  if (!row.published_at) throw new Error("A public post must have a publication date.");
  return {
    id: row.id, kind: row.kind, slug: row.slug, title: row.title, summary: row.summary,
    coverImagePath: row.cover_image_path, coverAlt: row.cover_alt, authorName: row.author_name ?? null,
    publishedAt: row.published_at, updatedAt: row.updated_at, readingTimeMinutes: row.reading_time_minutes ?? null,
    origin: row.origin ?? "castelao_cl",
    categories: (row.category_names ?? []).map((name, index) => ({ name, slug: row.category_slugs?.[index] ?? "" })).filter((category) => category.slug),
  };
}

export async function listBlogPosts({ query = "", category = null, page = 1 }: { query?: string; category?: string | null; page?: number } = {}): Promise<BlogPage> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  if (!hasSupabasePublicConfig()) return { posts: [], page: safePage, pageSize, total: 0, totalPages: 0 };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("search_blog_posts", {
    p_query: query.trim().slice(0, 120), p_category: category || null,
    p_offset: (safePage - 1) * pageSize, p_limit: pageSize,
  });
  if (error && isBlogSchemaUnavailable(error)) {
    // Before the blog migration exists, keep the public route operational with
    // the legacy CMS columns. Category filtering is unavailable in that schema.
    if (category) return { posts: [], page: safePage, pageSize, total: 0, totalPages: 0 };
    let legacyQuery = supabase.from("content_posts")
      .select("id, kind, slug, title, summary, cover_image_path, cover_alt, published_at, updated_at", { count: "exact" })
      .eq("kind", "blog").eq("status", "published").lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false }).order("id", { ascending: false })
      .range((safePage - 1) * pageSize, safePage * pageSize - 1);
    const legacySearch = query.trim().slice(0, 120);
    if (legacySearch) legacyQuery = legacyQuery.ilike("title", `%${legacySearch}%`);
    const { data: legacyData, error: legacyError, count } = await legacyQuery;
    if (legacyError) throw new Error("Could not search blog content.");
    const total = count ?? 0;
    return { posts: legacyData.map(mapSummary), page: safePage, pageSize, total, totalPages: total ? Math.ceil(total / pageSize) : 0 };
  }
  if (error) throw new Error("Could not search blog content.");
  const total = Number(data[0]?.total_count ?? 0);
  return { posts: data.map(mapSummary), page: safePage, pageSize, total, totalPages: total ? Math.ceil(total / pageSize) : 0 };
}

export async function listBlogCategories(): Promise<BlogCategory[]> {
  if (!hasSupabasePublicConfig()) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("blog_categories").select("id, name, slug, blog_post_categories(count)").order("name");
  if (error && isBlogSchemaUnavailable(error)) return [];
  if (error) throw new Error("Could not load blog categories.");
  return data.map((category) => ({ id: category.id, name: category.name, slug: category.slug, postCount: category.blog_post_categories[0]?.count ?? 0 })).filter((category) => category.postCount > 0);
}

export async function listPublishedPosts(kind: ContentKind, cursor?: string): Promise<PostPage> {
  if (!hasSupabasePublicConfig()) return { posts: [], nextCursor: null };
  const supabase = await createServerSupabaseClient();
  const parsedCursor = decodeCursor(cursor);
  let query = supabase.from("content_posts")
    .select("id, kind, slug, title, summary, cover_image_path, cover_alt, author_name, published_at, updated_at, reading_time_minutes, origin")
    .eq("kind", kind).eq("status", "published").lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize + 1);
  if (parsedCursor) query = query.or(`published_at.lt.${parsedCursor.publishedAt},and(published_at.eq.${parsedCursor.publishedAt},id.lt.${parsedCursor.id})`);
  const { data, error } = await query;
  if (error && isBlogSchemaUnavailable(error)) {
    let legacyQuery = supabase.from("content_posts")
      .select("id, kind, slug, title, summary, cover_image_path, cover_alt, published_at, updated_at")
      .eq("kind", kind).eq("status", "published").lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize + 1);
    if (parsedCursor) legacyQuery = legacyQuery.or(`published_at.lt.${parsedCursor.publishedAt},and(published_at.eq.${parsedCursor.publishedAt},id.lt.${parsedCursor.id})`);
    const { data: legacyData, error: legacyError } = await legacyQuery;
    if (legacyError) throw new Error("Could not load published content.");
    const posts = legacyData.slice(0, pageSize).map(mapSummary);
    return { posts, nextCursor: legacyData.length > pageSize && posts.at(-1) ? encodeCursor(posts.at(-1)!) : null };
  }
  if (error) throw new Error("Could not load published content.");
  const posts = data.slice(0, pageSize).map(mapSummary);
  return { posts, nextCursor: data.length > pageSize && posts.at(-1) ? encodeCursor(posts.at(-1)!) : null };
}

export async function getPublishedPost(kind: ContentKind, slug: string): Promise<PublicPost | null> {
  if (!hasSupabasePublicConfig()) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("content_posts")
    .select("id, kind, slug, title, summary, body, content_html, cover_image_path, cover_alt, author_name, published_at, updated_at, reading_time_minutes, origin, seo_title, seo_description, source_url, blog_post_categories(blog_categories(name, slug))")
    .eq("kind", kind).eq("slug", slug).eq("status", "published").lte("published_at", new Date().toISOString()).maybeSingle();
  if (error && isBlogSchemaUnavailable(error)) {
    const { data: legacyData, error: legacyError } = await supabase.from("content_posts")
      .select("id, kind, slug, title, summary, body, cover_image_path, cover_alt, published_at, updated_at")
      .eq("kind", kind).eq("slug", slug).eq("status", "published").lte("published_at", new Date().toISOString()).maybeSingle();
    if (legacyError) throw new Error("Could not load the published post.");
    if (!legacyData) return null;
    return { ...mapSummary(legacyData), body: legacyData.body, contentHtml: null, seoTitle: null, seoDescription: null, sourceUrl: null };
  }
  if (error) throw new Error("Could not load the published post.");
  if (!data) return null;
  const categories = data.blog_post_categories.map((relation) => relation.blog_categories).filter((category): category is { name: string; slug: string } => Boolean(category));
  return {
    ...mapSummary({ ...data, category_names: categories.map((category) => category.name), category_slugs: categories.map((category) => category.slug) }),
    body: data.body, contentHtml: data.content_html, seoTitle: data.seo_title,
    seoDescription: data.seo_description, sourceUrl: data.source_url,
  };
}

export async function listRelatedBlogPosts(post: PublicPost, limit = 3) {
  const page = await listBlogPosts({ category: post.categories[0]?.slug ?? null, page: 1 });
  return page.posts.filter((candidate) => candidate.id !== post.id).slice(0, limit);
}

export async function canReadContentMedia(path: string) {
  if (!hasSupabasePublicConfig()) return false;
  const safePath = path.replace(/[%,]/g, "");
  if (safePath !== path) return false;
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase.from("content_posts").select("id", { count: "exact", head: true })
    .ilike("content_html", `%/api/public/media/content/${safePath}%`);
  if (!error && (count ?? 0) > 0) return true;
  const { data, error: userError } = await supabase.auth.getUser();
  const userId = data.user?.id;
  return !userError && Boolean(userId) && safePath.startsWith(`${userId}/`);
}

export async function listSitemapPosts() {
  if (!hasSupabasePublicConfig()) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("content_posts").select("kind, slug, updated_at")
    .eq("status", "published").lte("published_at", new Date().toISOString()).order("published_at", { ascending: false });
  if (error) throw new Error("Could not load sitemap content.");
  return data;
}
