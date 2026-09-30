import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { blockSchema, pageEditSchema, parsePublicSections, professionalSchema, safeHref, mediaSrcSchema, settingsSchema } from "../src/lib/cms/schemas.ts";
import { sanitizeBlogHtml } from "../src/lib/blog/content.ts";
import { formatChileDate } from "../src/lib/format-chile-date.ts";

const hero = () => ({ id: randomUUID(), section_type: "hero", data: { title: "Página", description: "Descripción", eyebrow: "Instituto", variant: "blue" }, sort_order: 0, is_enabled: true });
const page = () => ({ id: randomUUID(), updated_at: new Date().toISOString(), title: "Página", nav_label: "Página", status: "draft", seo_title: "", seo_description: "", og_image_url: "", show_in_navigation: true, navigation_order: 0, sections: [hero()] });
test("admin dates use deterministic Chile timezone labels across SSR and browser", () => {
  assert.equal(formatChileDate("2026-09-30T01:30:00Z"), "29-09-2026");
  assert.equal(formatChileDate("2026-09-30T01:30:00Z", true), "29-09-2026 22:30");
});
test("typed blocks reject unknown types, unstructured JSON, scripts as URLs and invalid prices", () => {
  assert.ok(blockSchema.safeParse(hero()).success);
  assert.equal(blockSchema.safeParse({ ...hero(), section_type: "arbitrary_html" }).success, false);
  assert.equal(blockSchema.safeParse({ ...hero(), data: { title: "Página", scripts: "alert(1)" } }).success, false);
  assert.equal(blockSchema.safeParse({ ...hero(), section_type: "pricing", data: { title: "Valores", items: [{ title: "Evaluación", price: -1, unit: "" }] } }).success, false);
  for (const url of ["javascript:alert(1)", "//evil.test", "data:text/html,x", "https://example.test/\" onclick=\"x"]) assert.equal(safeHref.safeParse(url).success, false);
  assert.ok(safeHref.safeParse("/contacto").success);
  assert.equal(mediaSrcSchema.safeParse("https://example.test/photo.svg").success, false);
});
test("public sections are ordered and invalid or disabled blocks are isolated", () => {
  const sections = parsePublicSections([{ ...hero(), sort_order: 2 }, { ...hero(), sort_order: 1 }, { ...hero(), is_enabled: false }, { ...hero(), section_type: "unknown" }]);
  assert.deepEqual(sections.map((section) => section.sort_order), [1, 2]);
});
test("page publication requires one active first hero and no duplicate section IDs", () => {
  const valid = page(); assert.ok(pageEditSchema.safeParse(valid).success);
  assert.equal(pageEditSchema.safeParse({ ...valid, sections: [{ ...hero(), is_enabled: false }] }).success, false);
  assert.equal(pageEditSchema.safeParse({ ...valid, sections: [...valid.sections, ...valid.sections] }).success, false);
  assert.equal(pageEditSchema.safeParse({ ...valid, path: "/hijack" }).success, false);
});
test("professionals share one schema with optional credentials and mandatory image alt", () => {
  const blank = { full_name: "Persona de prueba", slug: "persona-prueba", role: "Rol editorial", credentials: [], short_bio: "", bio: "", professional_experience: "", recovery_experience: "", featured_quote: "", media: "", conferences: "", profile_image_url: "", profile_image_alt: "", email: "", phone: "", linkedin_url: "", instagram_url: "", cta_label: "", cta_url: "", is_featured: false, status: "draft", sort_order: 0, seo_title: "", seo_description: "" };
  assert.ok(professionalSchema.safeParse(blank).success);
  assert.equal(professionalSchema.safeParse({ ...blank, profile_image_url: "/images/photo.webp" }).success, false);
  assert.equal(professionalSchema.safeParse({ ...blank, slug: "../admin" }).success, false);
});
test("rich content reuses Noticias sanitization for scripts and inline events", () => {
  const safe = sanitizeBlogHtml('<p onclick="x()">Biografía</p><script>alert(1)</script><a href="javascript:x()">Enlace</a>');
  assert.ok(safe.includes("Biografía")); assert.doesNotMatch(safe, /script|onclick|javascript/);
});
test("global settings reject unsafe destinations and non-Chilean WhatsApp", () => {
  const settings = { whatsapp: "+56938650977", phone: "", email: "", streetAddress: "", city: "", region: "", country: "", mapsUrl: "", instagram: "", facebook: "", linkedin: "", evaluationUrl: "/contacto", evaluationLabel: "Agendar evaluación", footerNotice: "Información institucional" };
  assert.ok(settingsSchema.safeParse(settings).success);
  assert.equal(settingsSchema.safeParse({ ...settings, whatsapp: "+34900111222" }).success, false);
  assert.equal(settingsSchema.safeParse({ ...settings, evaluationUrl: "javascript:x()" }).success, false);
});
test("all institutional routes use CMS and public queries explicitly exclude drafts", () => {
  for (const route of ["", "instituto/", "acompanamiento/", "tratamiento/", "recovery-40/", "nuestro-enfoque/", "familias/", "equipo/", "preguntas-frecuentes/", "contacto/"]) assert.match(readFileSync(new URL(`../src/app/(public)/${route}page.tsx`, import.meta.url), "utf8"), /CmsRoute/);
  const repository = readFileSync(new URL("../src/lib/cms/repository.ts", import.meta.url), "utf8");
  assert.match(repository, /if \(!preview\) query = query.eq\("status", "published"\)/);
  assert.match(repository, /if \(preview\) await requireAdmin/);
  const profile = readFileSync(new URL("../src/app/(public)/equipo/[slug]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(profile, /Marcelo|marcelo-montiel/);
});
