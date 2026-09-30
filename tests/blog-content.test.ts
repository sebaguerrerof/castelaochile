import assert from "node:assert/strict";
import test from "node:test";

import { collectEditorialImageUrls, htmlToPlainText, sanitizeBlogHtml } from "../src/lib/blog/content.ts";
import { isBlogSchemaUnavailable } from "../src/lib/blog/schema-compatibility.ts";
import { decideSyncAction, normalizedPost, type WordPressPost } from "../scripts/blog-sync.ts";

function sourcePost(overrides: Partial<WordPressPost> = {}): WordPressPost {
  return {
    id: 42,
    slug: "alcohol-y-recuperacion",
    link: "https://www.institutocastelao.com/alcohol-y-recuperacion/",
    status: "publish",
    date: "2024-01-10T10:00:00",
    date_gmt: "2024-01-10T09:00:00",
    modified: "2024-02-10T10:00:00",
    modified_gmt: "2024-02-10T09:00:00",
    title: { rendered: "Alcohol y recuperación" },
    excerpt: { rendered: "Información clínica y editorial para comprender el proceso." },
    content: { rendered: "<h2>Comprender</h2><p>Un contenido seguro y útil para las familias.</p>" },
    featured_media: 0,
    _embedded: {
      author: [{ name: "Equipo Castelao" }],
      "wp:term": [[
        { id: 4, name: "Alcohol", slug: "alcohol", taxonomy: "category" },
        { id: 6, name: "Tratamientos", slug: "tratamientos", taxonomy: "category" },
      ]],
    },
    ...overrides,
  };
}

test("blog sanitizer rejects scripts, event handlers, iframes and unsafe URLs", () => {
  const html = sanitizeBlogHtml('<h1>Título</h1><p onclick="alert(1)">Texto</p><script>alert(1)</script><iframe src="https://evil.example"></iframe><a href="javascript:alert(1)">mal</a>');
  assert.match(html, /<h2>Título<\/h2>/);
  assert.match(html, /<p>Texto<\/p>/);
  assert.doesNotMatch(html, /script|onclick|iframe|javascript:/i);
});

test("legacy WordPress shortcodes are removed without losing editorial text", () => {
  const html = sanitizeBlogHtml("[caption id=\"attachment_1\"]<p>Texto conservado</p>[/caption][gallery ids=\"1,2\"]");
  assert.equal(html, "<p>Texto conservado</p>");
  assert.equal(htmlToPlainText(html), "Texto conservado");
});

test("Spanish contact promotions are not imported as editorial CTA", () => {
  const html = sanitizeBlogHtml("<p>Contenido clínico que se conserva.</p><p>Contamos con un teléfono gratuito y servicio de Whatsapp para asesoramiento.</p>");
  assert.match(html, /Contenido clínico/);
  assert.doesNotMatch(html, /Whatsapp|teléfono gratuito|asesoramiento/i);
});

test("normalizer handles multiple categories and a post without featured image", () => {
  const normalized = normalizedPost(sourcePost(), new Map());
  assert.deepEqual(normalized.categories, ["4", "6"]);
  assert.equal(normalized.managed.cover_image_path, null);
  assert.equal(normalized.managed.origin, "castelao_es");
  assert.equal(normalized.managed.source_post_id, "42");
  assert.equal(normalized.sourceHash.length, 64);
});

test("image discovery is editorial-only and unmigrated images are dropped", () => {
  const content = '<p>Texto</p><img src="https://www.institutocastelao.com/wp-content/a.jpg" onerror="alert(1)">';
  assert.deepEqual(collectEditorialImageUrls(content), ["https://www.institutocastelao.com/wp-content/a.jpg"]);
  const cleaned = sanitizeBlogHtml(content, { imageSources: new Map(), dropUnmappedImages: true });
  assert.doesNotMatch(cleaned, /img|onerror|institutocastelao/);
});

test("a missing featured image degrades to the native no-image state", () => {
  const source = "https://www.institutocastelao.com/wp-content/cover.jpg";
  const post = sourcePost();
  post.featured_media = 9;
  post._embedded = { ...post._embedded, "wp:featuredmedia": [{ source_url: source, alt_text: "Portada" }] };

  const missing = normalizedPost(post, new Map());
  assert.equal(missing.managed.cover_image_path, null);
  assert.equal(missing.managed.cover_alt, null);
  assert.equal(missing.managed.featured_image_source_url, source);

  const migrated = normalizedPost(post, new Map([[source, "/api/public/media/content/wordpress/42/cover"]]));
  assert.match(migrated.managed.cover_image_path ?? "", /^wordpress\/42\//);
  assert.equal(migrated.managed.cover_alt, "Portada");
});

test("sync planning creates, updates and remains idempotent", () => {
  assert.equal(decideSyncAction(undefined, "hash-a", false), "create");
  assert.equal(decideSyncAction("hash-a", "hash-b", true), "update");
  assert.equal(decideSyncAction("hash-a", "hash-a", false), "update");
  assert.equal(decideSyncAction("hash-a", "hash-a", true), "unchanged");
  const original = normalizedPost(sourcePost(), new Map());
  const changed = normalizedPost(sourcePost({ content: { rendered: "<p>Contenido modificado de la fuente.</p>" } }), new Map());
  assert.notEqual(original.sourceHash, changed.sourceHash);
});

test("schema compatibility only recognizes expected pending blog migrations", () => {
  assert.equal(isBlogSchemaUnavailable({ code: "42703", message: "column content_posts.reading_time_minutes does not exist" }), true);
  assert.equal(isBlogSchemaUnavailable({ code: "PGRST205", message: "Could not find the table 'public.blog_categories'" }), true);
  assert.equal(isBlogSchemaUnavailable({ code: "42501", message: "permission denied for table content_posts" }), false);
  assert.equal(isBlogSchemaUnavailable({ code: "42703", message: "column unrelated_typo does not exist" }), false);
});
