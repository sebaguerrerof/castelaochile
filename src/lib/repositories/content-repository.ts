import "server-only";

import { hasSupabasePublicConfig } from "@/lib/runtime-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContentKind } from "@/types/database";

export type PublicPost = {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverImagePath: string | null;
  coverAlt: string | null;
  publishedAt: string;
  updatedAt: string;
};

export type PostPage = { posts: PublicPost[]; nextCursor: string | null };

const pageSize = 12;
const cursorPattern = /^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+-]+Z)\.([0-9a-f-]{36})$/i;

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return null;
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  const match = cursorPattern.exec(decoded);
  if (!match || Number.isNaN(Date.parse(match[1]))) return null;
  return { publishedAt: match[1], id: match[2] };
}

function encodeCursor(post: PublicPost) {
  return Buffer.from(`${post.publishedAt}.${post.id}`).toString("base64url");
}

function mapPublicPost(row: {
  id: string; kind: ContentKind; slug: string; title: string; summary: string; body: string;
  cover_image_path: string | null; cover_alt: string | null; published_at: string | null; updated_at: string;
}): PublicPost {
  if (!row.published_at) throw new Error("A public post must have a publication date.");
  return {
    id: row.id, kind: row.kind, slug: row.slug, title: row.title, summary: row.summary, body: row.body,
    coverImagePath: row.cover_image_path, coverAlt: row.cover_alt, publishedAt: row.published_at, updatedAt: row.updated_at,
  };
}

export async function listPublishedPosts(kind: ContentKind, cursor?: string): Promise<PostPage> {
  if (!hasSupabasePublicConfig()) return { posts: [], nextCursor: null };
  const supabase = await createServerSupabaseClient();
  const parsedCursor = decodeCursor(cursor);
  let query = supabase
    .from("content_posts")
    .select("id, kind, slug, title, summary, body, cover_image_path, cover_alt, published_at, updated_at")
    .eq("kind", kind)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsedCursor) {
    query = query.or(
      `published_at.lt.${parsedCursor.publishedAt},and(published_at.eq.${parsedCursor.publishedAt},id.lt.${parsedCursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error("Could not load published content.");
  const posts = (data.slice(0, pageSize)).map(mapPublicPost);
  return { posts, nextCursor: data.length > pageSize && posts.at(-1) ? encodeCursor(posts.at(-1)!) : null };
}

export async function getPublishedPost(kind: ContentKind, slug: string): Promise<PublicPost | null> {
  if (!hasSupabasePublicConfig()) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("id, kind, slug, title, summary, body, cover_image_path, cover_alt, published_at, updated_at")
    .eq("kind", kind)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Could not load the published post.");
  return data ? mapPublicPost(data) : null;
}

export async function listSitemapPosts() {
  if (!hasSupabasePublicConfig()) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("kind, slug, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error("Could not load sitemap content.");
  return data;
}
