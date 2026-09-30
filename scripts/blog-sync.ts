import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import {
  collectEditorialImageUrls,
  createExcerpt,
  estimateReadingTime,
  htmlToPlainText,
  sanitizeBlogHtml,
  slugifyBlogValue,
} from "../src/lib/blog/content.ts";

const USER_AGENT = "CastelaoChileBlogSync/1.0 (+https://deptolab.cl)";
const STORAGE_BUCKET = "content-images";
const PAGE_SIZE = 100;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type WordPressText = { rendered: string };
type WordPressCategory = { id: number; name: string; slug: string; count: number };
type WordPressTerm = { id: number; name: string; slug: string; taxonomy: string };
type WordPressMedia = { alt_text?: string; source_url?: string };
export type WordPressPost = {
  id: number;
  slug: string;
  link: string;
  status: string;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  title: WordPressText;
  excerpt: WordPressText;
  content: WordPressText;
  featured_media: number;
  _embedded?: {
    author?: Array<{ name?: string }>;
    "wp:featuredmedia"?: WordPressMedia[];
    "wp:term"?: WordPressTerm[][];
  };
};

type DestinationCategory = {
  id: string;
  slug: string;
  name: string;
  source_category_id: string | null;
};

type ExistingPost = {
  id: string;
  slug: string;
  source_hash: string | null;
};

type SyncOptions = { dryRun: boolean; limit: number | null };
type Summary = {
  discovered: number;
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  mediaMigrated: number;
  mediaFailed: number;
  categories: number;
  errors: string[];
  mediaErrors: string[];
};

function parseOptions(): SyncOptions {
  const args = process.argv.slice(2);
  const limitArgument = args.find((argument) => argument.startsWith("--limit="));
  const limit = limitArgument ? Number.parseInt(limitArgument.slice("--limit=".length), 10) : null;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) throw new Error("--limit must be a positive integer.");
  return { dryRun: args.includes("--dry-run"), limit };
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url: URL, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json, image/*;q=0.9", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(500 * (3 ** (attempt - 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Network request failed.");
}

function sourceDate(gmtValue: string, fallbackValue: string) {
  const raw = gmtValue && !gmtValue.startsWith("0000-") ? `${gmtValue}Z` : fallbackValue;
  const date = new Date(raw);
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid WordPress date: ${raw}`);
  return date.toISOString();
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function storagePath(postId: number, sourceUrl: string) {
  const imageId = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 32);
  return `wordpress/${postId}/${imageId}`;
}

function publicMediaPath(path: string) {
  return `/api/public/media/content/${path}`;
}

function categoryTerms(post: WordPressPost) {
  return (post._embedded?.["wp:term"] ?? []).flat().filter((term) => term.taxonomy === "category");
}

function featuredMedia(post: WordPressPost) {
  return post._embedded?.["wp:featuredmedia"]?.[0] ?? null;
}

export function normalizedPost(post: WordPressPost, imageMap: ReadonlyMap<string, string>) {
  const title = htmlToPlainText(post.title.rendered).slice(0, 160);
  const contentHtml = sanitizeBlogHtml(post.content.rendered, { imageSources: imageMap, dropUnmappedImages: true });
  const contentText = htmlToPlainText(contentHtml);
  const summaryCandidate = createExcerpt(post.excerpt.rendered, contentText);
  const summary = (summaryCandidate.length >= 10 ? summaryCandidate : `${title} — publicación editorial.`).slice(0, 320);
  const media = featuredMedia(post);
  const featuredSource = media?.source_url?.trim() || null;
  const coverImagePath = featuredSource && imageMap.has(featuredSource) ? storagePath(post.id, featuredSource) : null;
  const coverAltCandidate = htmlToPlainText(media?.alt_text ?? "");
  const coverAlt = coverImagePath ? (coverAltCandidate.length >= 3 ? coverAltCandidate : title).slice(0, 160) : null;
  const sourceUrl = new URL(post.link).toString();
  const sourceUpdatedAt = sourceDate(post.modified_gmt, post.modified);
  const publishedAt = sourceDate(post.date_gmt, post.date);
  const categories = categoryTerms(post).map((term) => String(term.id)).sort();
  const managed = {
    kind: "blog" as const,
    slug: slugifyBlogValue(post.slug || title),
    title,
    summary,
    body: contentText.slice(0, 50_000),
    content_html: contentHtml,
    content_text: contentText,
    cover_image_path: coverImagePath,
    cover_alt: coverAlt,
    featured_image_source_url: featuredSource,
    author_id: null,
    author_name: (post._embedded?.author?.[0]?.name?.trim() || "Equipo Castelao").slice(0, 160),
    published_at: publishedAt,
    source_updated_at: sourceUpdatedAt,
    reading_time_minutes: estimateReadingTime(contentText),
    origin: "castelao_es" as const,
    source_post_id: String(post.id),
    source_url: sourceUrl,
  };
  return { categories, managed, sourceHash: stableHash({ ...managed, categories }) };
}

async function fetchSource(baseUrl: URL, limit: number | null) {
  const categoriesUrl = new URL("/wp-json/wp/v2/categories", baseUrl);
  categoriesUrl.search = new URLSearchParams({ per_page: "100", hide_empty: "false" }).toString();
  const categoriesResponse = await fetchWithRetry(categoriesUrl);
  const categories = await categoriesResponse.json() as WordPressCategory[];

  const posts: WordPressPost[] = [];
  let total = 0;
  let page = 1;
  do {
    const postsUrl = new URL("/wp-json/wp/v2/posts", baseUrl);
    postsUrl.search = new URLSearchParams({ _embed: "1", order: "asc", orderby: "id", page: String(page), per_page: String(PAGE_SIZE), status: "publish" }).toString();
    const response = await fetchWithRetry(postsUrl);
    if (page === 1) total = Number.parseInt(response.headers.get("x-wp-total") ?? "0", 10);
    posts.push(...await response.json() as WordPressPost[]);
    page += 1;
  } while (posts.length < total && (limit === null || posts.length < limit));

  return { categories, posts: limit === null ? posts : posts.slice(0, limit), total };
}

async function ensureCategories(supabase: ReturnType<typeof createClient>, sourceCategories: WordPressCategory[], dryRun: boolean) {
  const { data, error } = await supabase.from("blog_categories").select("id, slug, name, source_category_id");
  if (error) throw new Error(`Could not load destination categories: ${error.message}`);
  const destination = (data ?? []) as DestinationCategory[];
  const mapping = new Map<string, string>();

  for (const category of sourceCategories) {
    const sourceId = String(category.id);
    const slug = slugifyBlogValue(category.slug || category.name);
    const bySource = destination.find((item) => item.source_category_id === sourceId);
    const bySlug = destination.find((item) => item.slug === slug);
    const existing = bySource ?? bySlug;
    if (existing) {
      mapping.set(sourceId, existing.id);
      if (!dryRun && bySource && (existing.name !== category.name || existing.slug !== slug)) {
        const { error: updateError } = await supabase.from("blog_categories").update({ name: category.name.slice(0, 100), slug }).eq("id", existing.id);
        if (updateError) throw new Error(`Could not update category ${sourceId}: ${updateError.message}`);
        existing.name = category.name;
        existing.slug = slug;
      }
      continue;
    }
    if (dryRun) continue;
    const { data: inserted, error: insertError } = await supabase
      .from("blog_categories")
      .insert({ name: category.name.slice(0, 100), slug, source_category_id: sourceId })
      .select("id, slug, name, source_category_id")
      .single();
    if (insertError || !inserted) throw new Error(`Could not create category ${sourceId}: ${insertError?.message ?? "unknown error"}`);
    destination.push(inserted as DestinationCategory);
    mapping.set(sourceId, inserted.id);
  }
  return mapping;
}

async function existingPostForSource(supabase: ReturnType<typeof createClient>, sourcePostId: string) {
  const { data, error } = await supabase.from("content_posts").select("id, slug, source_hash").eq("origin", "castelao_es").eq("source_post_id", sourcePostId).maybeSingle();
  if (error) throw new Error(`Could not look up source post ${sourcePostId}: ${error.message}`);
  return data as ExistingPost | null;
}

async function collisionSafeSlug(supabase: ReturnType<typeof createClient>, desired: string, sourcePostId: string, existingId: string | null) {
  const candidates = [desired, `${desired}-espana`, `${desired}-espana-${sourcePostId}`];
  for (const candidate of candidates) {
    const { data, error } = await supabase.from("content_posts").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw new Error(`Could not validate slug ${candidate}: ${error.message}`);
    if (!data || data.id === existingId) return candidate;
  }
  throw new Error(`Could not resolve slug collision for source post ${sourcePostId}.`);
}

async function currentCategoryIds(supabase: ReturnType<typeof createClient>, postId: string) {
  const { data, error } = await supabase.from("blog_post_categories").select("category_id").eq("post_id", postId);
  if (error) throw new Error(`Could not load post categories: ${error.message}`);
  return (data ?? []).map((item) => item.category_id as string).sort();
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function decideSyncAction(existingHash: string | null | undefined, desiredHash: string, categoriesMatch: boolean) {
  if (existingHash === undefined) return "create" as const;
  return existingHash === desiredHash && categoriesMatch ? "unchanged" as const : "update" as const;
}

async function replaceCategories(supabase: ReturnType<typeof createClient>, postId: string, categoryIds: string[]) {
  const { error: deleteError } = await supabase.from("blog_post_categories").delete().eq("post_id", postId);
  if (deleteError) throw new Error(`Could not replace post categories: ${deleteError.message}`);
  if (!categoryIds.length) return;
  const { error: insertError } = await supabase.from("blog_post_categories").insert(categoryIds.map((categoryId) => ({ post_id: postId, category_id: categoryId })));
  if (insertError) throw new Error(`Could not attach post categories: ${insertError.message}`);
}

function permittedSourceMediaUrl(source: string, sourceBaseUrl: URL) {
  const url = new URL(source);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Media URL does not use HTTP(S).");
  const expectedHost = sourceBaseUrl.hostname.toLowerCase();
  const actualHost = url.hostname.toLowerCase();
  if (actualHost !== expectedHost && !actualHost.endsWith(`.${expectedHost.replace(/^www\./, "")}`)) throw new Error(`Media host is not allowed: ${actualHost}`);
  return url;
}

async function migrateMedia(supabase: ReturnType<typeof createClient>, post: WordPressPost, sourceBaseUrl: URL) {
  const mediaSources = new Set(collectEditorialImageUrls(post.content.rendered));
  const featuredSource = featuredMedia(post)?.source_url?.trim();
  if (featuredSource) mediaSources.add(featuredSource);
  const imageMap = new Map<string, string>();
  let migrated = 0;
  const errors: string[] = [];

  for (const source of mediaSources) {
    try {
      const url = permittedSourceMediaUrl(source, sourceBaseUrl);
      const response = await fetchWithRetry(url);
      const contentLength = Number.parseInt(response.headers.get("content-length") ?? "0", 10);
      if (contentLength > MAX_MEDIA_BYTES) throw new Error(`Media exceeds 5 MB: ${url.pathname}`);
      const contentType = (response.headers.get("content-type") ?? "").split(";", 1)[0].toLowerCase();
      if (!ALLOWED_MEDIA_TYPES.has(contentType)) throw new Error(`Unsupported media type ${contentType || "unknown"}: ${url.pathname}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error(`Media exceeds 5 MB: ${url.pathname}`);
      const path = storagePath(post.id, source);
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, { cacheControl: "31536000", contentType, upsert: true });
      if (error) throw new Error(`Could not store ${url.pathname}: ${error.message}`);
      imageMap.set(source, publicMediaPath(path));
      migrated += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown media error";
      errors.push(`post ${post.id}: ${message}`);
    }
  }
  return { imageMap, migrated, errors };
}

export async function syncCastelaoBlog(options: SyncOptions = parseOptions()) {
  const startedAt = performance.now();
  const sourceBaseUrl = new URL(process.env.CASTELAO_SOURCE_BASE_URL?.trim() || "https://www.institutocastelao.com");
  const supabaseUrl = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requiredEnvironment("SUPABASE_SECRET_KEY");
  const supabase = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
  const source = await fetchSource(sourceBaseUrl, options.limit);
  const summary: Summary = { discovered: source.total, processed: source.posts.length, created: 0, updated: 0, unchanged: 0, failed: 0, mediaMigrated: 0, mediaFailed: 0, categories: source.categories.length, errors: [], mediaErrors: [] };
  const categoryMapping = await ensureCategories(supabase, source.categories, options.dryRun);

  for (const sourcePost of source.posts) {
    try {
      const desiredImageMap = new Map<string, string>();
      const desiredSources = new Set(collectEditorialImageUrls(sourcePost.content.rendered));
      const desiredFeatured = featuredMedia(sourcePost)?.source_url?.trim();
      if (desiredFeatured) desiredSources.add(desiredFeatured);
      for (const sourceUrl of desiredSources) desiredImageMap.set(sourceUrl, publicMediaPath(storagePath(sourcePost.id, sourceUrl)));

      const desired = normalizedPost(sourcePost, desiredImageMap);
      const existing = await existingPostForSource(supabase, desired.managed.source_post_id);
      const desiredCategoryIds = desired.categories.map((id) => categoryMapping.get(id)).filter((id): id is string => Boolean(id)).sort();
      const currentCategories = existing ? await currentCategoryIds(supabase, existing.id) : [];
      const categoriesMatch = existing ? sameIds(currentCategories, desiredCategoryIds) : false;
      const decision = decideSyncAction(existing?.source_hash, desired.sourceHash, categoriesMatch);
      if (decision === "unchanged") {
        summary.unchanged += 1;
        continue;
      }
      if (options.dryRun) {
        if (decision === "update") summary.updated += 1;
        else summary.created += 1;
        continue;
      }

      let finalNormalized = desired;
      if (!existing || existing.source_hash !== desired.sourceHash) {
        const media = await migrateMedia(supabase, sourcePost, sourceBaseUrl);
        summary.mediaMigrated += media.migrated;
        summary.mediaFailed += media.errors.length;
        summary.mediaErrors.push(...media.errors);
        finalNormalized = normalizedPost(sourcePost, media.imageMap);
      }

      const slug = await collisionSafeSlug(supabase, finalNormalized.managed.slug, finalNormalized.managed.source_post_id, existing?.id ?? null);
      const syncedAt = new Date().toISOString();
      let postId: string;
      if (existing) {
        const { error } = await supabase.from("content_posts").update({ ...finalNormalized.managed, slug, source_hash: desired.sourceHash, synced_at: syncedAt }).eq("id", existing.id);
        if (error) throw new Error(`Could not update post ${sourcePost.id}: ${error.message}`);
        postId = existing.id;
      } else {
        const { data, error } = await supabase.from("content_posts").insert({ ...finalNormalized.managed, slug, source_hash: desired.sourceHash, synced_at: syncedAt, status: "published" }).select("id").single();
        if (error || !data) throw new Error(`Could not create post ${sourcePost.id}: ${error?.message ?? "unknown error"}`);
        postId = data.id as string;
      }
      await replaceCategories(supabase, postId, desiredCategoryIds);
      if (existing) summary.updated += 1;
      else summary.created += 1;
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : "Unknown synchronization error";
      summary.errors.push(`post ${sourcePost.id}: ${message}`);
    }
  }

  const durationSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
  console.log("Castelao Blog Sync");
  console.log(`Mode: ${options.dryRun ? "dry-run" : "write"}`);
  console.log(`Source posts discovered: ${summary.discovered}`);
  console.log(`Processed: ${summary.processed}`);
  console.log(`Created: ${summary.created}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Unchanged: ${summary.unchanged}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Categories: ${summary.categories}`);
  console.log(`Media migrated: ${summary.mediaMigrated}`);
  console.log(`Media failures: ${summary.mediaFailed}`);
  console.log(`Duration: ${durationSeconds}s`);
  if (summary.errors.length) {
    console.error("Errors:");
    for (const error of summary.errors.slice(0, 25)) console.error(`- ${error}`);
    if (summary.errors.length > 25) console.error(`- ${summary.errors.length - 25} additional errors omitted`);
    process.exitCode = 1;
  }
  if (summary.mediaErrors.length) {
    console.warn("Media warnings (articles were preserved without the affected image):");
    for (const error of summary.mediaErrors.slice(0, 25)) console.warn(`- ${error}`);
    if (summary.mediaErrors.length > 25) console.warn(`- ${summary.mediaErrors.length - 25} additional media warnings omitted`);
  }
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncCastelaoBlog().catch((error) => {
    console.error("Castelao Blog Sync failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
