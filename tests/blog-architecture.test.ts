import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const source = (path: string) => readFileSync(new URL(path, `file:///${workspace.replace(/\\/g, "/")}`), "utf8");

test("blog search is server-side, accent-normalized and excludes non-public posts", () => {
  const migration = source("supabase/migrations/20260929195908_extend_content_posts_for_blog_sync.sql");
  const repository = source("src/lib/repositories/content-repository.ts");
  assert.match(migration, /websearch_to_tsquery\('spanish', extensions\.unaccent/);
  assert.match(migration, /post\.status = 'published'/);
  assert.match(migration, /post\.published_at <= now\(\)/);
  assert.match(migration, /offset greatest\(p_offset, 0\)/);
  assert.match(repository, /\.rpc\("search_blog_posts"/);
  assert.doesNotMatch(repository, /posts\.filter\([^)]*query/);
});

test("blog pagination preserves search and category in shareable URLs", () => {
  const pagination = source("src/components/content/blog-pagination.tsx");
  assert.match(pagination, /params\.set\("q", query\)/);
  assert.match(pagination, /params\.set\("categoria", category\)/);
  assert.match(pagination, /aria-current/);
  assert.match(pagination, /rel="prev"/);
  assert.match(pagination, /rel="next"/);
});

test("blog routes, skeletons, sanitization and structured data are present", () => {
  assert.ok(existsSync(new URL("../src/app/(public)/blog/page.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../src/app/(public)/blog/loading.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../src/app/(public)/blog/error.tsx", import.meta.url)));
  assert.ok(existsSync(new URL("../src/app/(public)/blog/[slug]/page.tsx", import.meta.url)));
  const detail = source("src/app/(public)/blog/[slug]/page.tsx");
  const cover = source("src/components/content/published-cover.tsx");
  assert.match(detail, /notFound\(\)/);
  assert.match(detail, /application\/ld\+json/);
  assert.match(detail, /<SafeHtml/);
  assert.match(cover, /unoptimized/);
});

test("sync targets only Spain records and never overwrites local status or SEO", () => {
  const sync = source("scripts/blog-sync.ts");
  assert.match(sync, /\.eq\("origin", "castelao_es"\)/);
  assert.match(sync, /source_post_id/);
  const updateBranch = sync.match(/if \(existing\) \{([\s\S]*?)\} else \{/)?.[1] ?? "";
  assert.match(updateBranch, /\.update\(\{ \.\.\.finalNormalized\.managed/);
  assert.doesNotMatch(updateBranch, /status\s*:/);
  assert.doesNotMatch(updateBranch, /seo_title\s*:/);
});

test("article hero and readable content are shared without changing editorial data", () => {
  const hero = source("src/components/content/article-hero.tsx");
  const css = source("src/app/(public)/public-content.css");
  assert.match(hero, /post.coverImagePath && <PublishedCover/);
  assert.match(hero, /<h1>\{post.title\}<\/h1>/);
  assert.match(hero, /eager kind=\{post.kind\}/);
  for (const route of ["blog", "noticias"]) {
    assert.match(source(`src/app/(public)/${route}/[slug]/page.tsx`), /<ArticleHero post=\{post\}/);
  }
  assert.match(css, /\.article-body \{ max-width: 68ch/);
  assert.match(css, /\.article-hero--image::after/);
  assert.match(css, /\.article-hero a:focus-visible/);
});

test("admin covers full editorial model and source-managed fields are locked", () => {
  const editor = source("src/components/admin/content-editor.tsx");
  const repository = source("src/lib/repositories/content-repository.ts");
  const migration = source("supabase/migrations/20260929195908_extend_content_posts_for_blog_sync.sql");
  for (const field of ["authorName", "categoryIds", "contentHtml", "coverImagePath", "coverAlt", "publishedAt", "seoTitle", "seoDescription", "status"]) assert.match(editor, new RegExp(field));
  assert.match(editor, /origin === "castelao_es"/);
  assert.match(editor, /readOnly=\{synchronized\}/);
  assert.match(repository, /supabase\.auth\.getUser\(\)/);
  assert.match(repository, /safePath\.startsWith\(`\$\{userId\}\/`\)/);
  assert.match(migration, /protect_synced_content_fields/);
  assert.match(migration, /source-managed fields of synchronized content are read-only/);
});
