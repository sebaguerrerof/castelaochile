import { createClient } from "@supabase/supabase-js";

import { syncCastelaoBlog } from "./blog-sync.ts";

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  if (process.env.BLOG_SYNC_TEST_ALLOW !== "preview") {
    throw new Error("Refusing to mutate data without BLOG_SYNC_TEST_ALLOW=preview.");
  }

  const client = createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
  );
  const { data: post, error } = await client
    .from("content_posts")
    .select("id, status, seo_title, seo_description, source_hash")
    .eq("origin", "castelao_es")
    .order("source_post_id", { ascending: true })
    .limit(1)
    .single();
  if (error || !post) throw error ?? new Error("No synchronized post available for the preservation test.");

  const markerTitle = "SEO local preservado por prueba";
  const markerDescription = "La sincronización no puede sobrescribir este override editorial local.";
  try {
    const { error: prepareError } = await client.from("content_posts").update({
      status: "archived",
      seo_title: markerTitle,
      seo_description: markerDescription,
      source_hash: "0".repeat(64),
    }).eq("id", post.id);
    if (prepareError) throw prepareError;

    const summary = await syncCastelaoBlog({ dryRun: false, limit: 1 });
    assert(summary.updated === 1 && summary.failed === 0, "The forced source update did not complete cleanly.");

    const { data: refreshed, error: refreshedError } = await client
      .from("content_posts")
      .select("status, seo_title, seo_description, source_hash")
      .eq("id", post.id)
      .single();
    if (refreshedError || !refreshed) throw refreshedError ?? new Error("Could not reload the test post.");
    assert(refreshed.status === "archived", "Synchronization overwrote the local publication status.");
    assert(refreshed.seo_title === markerTitle, "Synchronization overwrote the local SEO title.");
    assert(refreshed.seo_description === markerDescription, "Synchronization overwrote the local SEO description.");
    assert(refreshed.source_hash !== "0".repeat(64), "Synchronization did not refresh source-managed fields.");

    console.log(JSON.stringify({ status: "PASS", sourceUpdated: true, localStatusPreserved: true, localSeoPreserved: true }, null, 2));
  } finally {
    const { error: restoreError } = await client.from("content_posts").update({
      status: post.status,
      seo_title: post.seo_title,
      seo_description: post.seo_description,
      source_hash: post.source_hash,
    }).eq("id", post.id);
    if (restoreError) throw restoreError;
  }
}

main().catch((error) => {
  console.error("Blog synchronization preservation test failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
