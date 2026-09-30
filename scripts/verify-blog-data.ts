import { createClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "content-images";
const EXPECTED_MINIMUM_POSTS = 232;

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function consume() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, consume));
  return results;
}

async function main() {
  const url = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const secret = requiredEnvironment("SUPABASE_SECRET_KEY");
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!publicKey) throw new Error("Missing public Supabase key for RLS verification.");

  const service = createClient(url, secret, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
  const publicClient = createClient(url, publicKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });

  const { data: posts, error: postsError } = await service
    .from("content_posts")
    .select("id, slug, title, status, published_at, content_html, cover_image_path, source_post_id, source_url, source_hash, author_name, synced_at")
    .eq("origin", "castelao_es")
    .order("published_at", { ascending: true })
    .limit(1000);
  if (postsError) throw postsError;

  const { data: categories, error: categoriesError } = await service
    .from("blog_categories")
    .select("id, name, slug, source_category_id, blog_post_categories(count)")
    .order("name");
  if (categoriesError) throw categoriesError;

  const { data: relations, error: relationsError } = await service
    .from("blog_post_categories")
    .select("post_id, category_id")
    .limit(5000);
  if (relationsError) throw relationsError;

  const { data: alcoholPageOne, error: searchOneError } = await publicClient.rpc("search_blog_posts", {
    p_query: "alcohol", p_category: null, p_offset: 0, p_limit: 12,
  });
  if (searchOneError) throw searchOneError;
  const { data: alcoholPageTwo, error: searchTwoError } = await publicClient.rpc("search_blog_posts", {
    p_query: "alcohol", p_category: null, p_offset: 12, p_limit: 12,
  });
  if (searchTwoError) throw searchTwoError;

  const sourceIds = posts.map((post) => post.source_post_id);
  const slugs = posts.map((post) => post.slug);
  const relationPostIds = new Set(relations.map((relation) => relation.post_id));
  const unsafePattern = /<(?:script|iframe|form|style)\b|\son\w+\s*=|javascript:/i;
  const remoteImagePattern = /<img\b[^>]*\bsrc=["'][^"']*institutocastelao\.com/i;
  const sourcePromotionPattern = /tel[eé]fono gratuito|whatsapp.{0,140}(?:asesoramiento|servicio)|(?:asesoramiento|servicio).{0,140}whatsapp/i;
  const mediaPathPattern = /\/api\/public\/media\/content\/([^"'\s>]+)/g;
  const referencedPaths = new Set<string>();
  for (const post of posts) {
    if (post.cover_image_path) referencedPaths.add(post.cover_image_path);
    for (const match of (post.content_html ?? "").matchAll(mediaPathPattern)) referencedPaths.add(match[1]);
  }

  const { data: postFolders, error: folderError } = await service.storage.from(STORAGE_BUCKET).list("wordpress", { limit: 1000 });
  if (folderError) throw folderError;
  const folderNames = (postFolders ?? []).map((entry) => entry.name);
  const storagePaths = (await mapConcurrent(folderNames, 12, async (folder) => {
    const { data, error } = await service.storage.from(STORAGE_BUCKET).list(`wordpress/${folder}`, { limit: 1000 });
    if (error) throw error;
    return (data ?? []).filter((entry) => entry.id).map((entry) => `wordpress/${folder}/${entry.name}`);
  })).flat();
  const storagePathSet = new Set(storagePaths);
  const missingReferencedMedia = [...referencedPaths].filter((path) => !storagePathSet.has(path));

  const categoryMetrics = categories.map((category) => ({
    name: category.name,
    slug: category.slug,
    posts: category.blog_post_categories?.[0]?.count ?? 0,
  }));
  const metrics = {
    posts: posts.length,
    published: posts.filter((post) => post.status === "published").length,
    categories: categories.length,
    categoryRelations: relations.length,
    categorylessPosts: posts.filter((post) => !relationPostIds.has(post.id)).length,
    postsWithoutCover: posts.filter((post) => !post.cover_image_path).length,
    postsWithoutAuthor: posts.filter((post) => !post.author_name).length,
    postsWithoutContent: posts.filter((post) => !(post.content_html ?? "").trim()).length,
    unsafeHtmlPosts: posts.filter((post) => unsafePattern.test(post.content_html ?? "")).length,
    remoteSourceImagePosts: posts.filter((post) => remoteImagePattern.test(post.content_html ?? "")).length,
    sourcePromotionPosts: posts.filter((post) => sourcePromotionPattern.test(post.content_html ?? "")).length,
    duplicateSourceIds: sourceIds.length - new Set(sourceIds).size,
    duplicateSlugs: slugs.length - new Set(slugs).size,
    referencedMedia: referencedPaths.size,
    storageMediaObjects: storagePathSet.size,
    missingReferencedMedia: missingReferencedMedia.length,
    alcoholSearchTotal: Number(alcoholPageOne?.[0]?.total_count ?? 0),
    alcoholPageOne: alcoholPageOne?.length ?? 0,
    alcoholPageTwo: alcoholPageTwo?.length ?? 0,
    oldest: posts[0] ? { slug: posts[0].slug, publishedAt: posts[0].published_at } : null,
    newest: posts.at(-1) ? { slug: posts.at(-1)!.slug, publishedAt: posts.at(-1)!.published_at } : null,
    categoriesBreakdown: categoryMetrics,
  };

  assert(metrics.posts >= EXPECTED_MINIMUM_POSTS, `Expected at least ${EXPECTED_MINIMUM_POSTS} synchronized posts.`);
  assert(metrics.categories >= 11, "Expected the complete source category set.");
  assert(metrics.published === metrics.posts, "All synchronized source posts should initially be published.");
  assert(metrics.postsWithoutContent === 0, "Synchronized posts with empty HTML were found.");
  assert(metrics.unsafeHtmlPosts === 0, "Unsafe HTML survived sanitization.");
  assert(metrics.remoteSourceImagePosts === 0, "Runtime-dependent source images remain in article HTML.");
  assert(metrics.sourcePromotionPosts === 0, "A Spanish contact promotion survived sanitization.");
  assert(metrics.duplicateSourceIds === 0, "Duplicate source IDs were found.");
  assert(metrics.duplicateSlugs === 0, "Duplicate slugs were found.");
  assert(metrics.missingReferencedMedia === 0, "A referenced Storage media object is missing.");
  assert(metrics.alcoholSearchTotal > 12 && metrics.alcoholPageOne === 12 && metrics.alcoholPageTwo > 0, "Search plus pagination did not return the expected public result shape.");

  console.log(JSON.stringify({ status: "PASS", ...metrics }, null, 2));
}

main().catch((error) => {
  console.error("Blog data verification failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
