import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.CMS_QA_BASE_URL ?? "http://localhost:3200";
const out = "tmp/cms-qa";
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const fixtures = { pages: [], people: [], posts: [], storage: [], personSlugs: [], postSlugs: [] };
const results = [];
let browser, sessionClient;
await mkdir(out, { recursive: true });
function checkDb(result) { if (result.error) throw new Error(`Database QA failed: ${result.error.code ?? "unknown"}`); return result.data; }
async function submitAndWait(page, label) {
  const saved = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname.startsWith("/admin/"));
  await page.getByRole("button", { name: label, exact: true }).click();
  await saved;
  await page.waitForURL(/success=saved/);
  await page.waitForFunction(() => [...document.querySelectorAll('form button[type="submit"]')].every((button) => !button.disabled));
}
async function inspect(context, path, width, authenticated = false) {
  const page = await context.newPage();
  // Measure the current screen independently of speculative Next route prefetches.
  await page.route("**/*", (route) => { const headers = route.request().headers(); return headers["next-router-prefetch"] || headers["next-router-segment-prefetch"] || headers.purpose === "prefetch" ? route.abort() : route.continue(); });
  page.setDefaultNavigationTimeout(60000);
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  const pendingRequests = new Set();
  page.on("request", (request) => pendingRequests.add(request));
  page.on("requestfinished", (request) => pendingRequests.delete(request));
  page.on("requestfailed", (request) => pendingRequests.delete(request));
  await page.setViewportSize({ width, height: 900 });
  const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
  assert(response?.status() < 400, `${path}: HTTP ${response?.status()}`);
  await page.locator("h1").first().waitFor();
  if (authenticated) await page.locator(".admin-shell").waitFor().catch(() => {});
  await page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  if (pendingRequests.size) console.log(`Background requests at readiness: ${pendingRequests.size}`);
  const metrics = await page.evaluate(() => ({ h1: document.querySelectorAll("h1").length, overflow: document.documentElement.scrollWidth > innerWidth + 1, broken: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src), canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"), robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") }));
  if (metrics.overflow) {
    console.log("Overflow elements:", await page.evaluate(() => [...document.querySelectorAll("body *")].map((element) => ({ tag: element.tagName, class: element.className, right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width })).filter((element) => element.right > innerWidth + 1).slice(-15)));
    await page.screenshot({ path: join(out, `overflow-${width}.png`), fullPage: true, style: ".admin-sidebar-account-copy,.admin-user-menu-copy { visibility:hidden !important }" });
  }
  assert.equal(metrics.h1, 1, `${path}: expected one H1`);
  assert.equal(metrics.overflow, false, `${path}: horizontal overflow at ${width}`);
  assert.deepEqual(metrics.broken, [], `${path}: broken images`);
  assert.deepEqual(errors, [], `${path}: browser errors`);
  if (!authenticated && !path.startsWith("/admin")) assert(metrics.canonical, `${path}: missing canonical`);
  if (path.includes("vista-previa")) assert(metrics.robots?.includes("noindex"), `${path}: preview indexable`);
  if (path === "/" && width === 375) {
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    await page.getByRole("navigation", { name: "Navegación móvil" }).locator("summary").filter({ hasText: "Instituto" }).click();
    await page.getByRole("navigation", { name: "Navegación móvil" }).getByRole("link", { name: "Equipo", exact: true }).waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector("#mobile-menu-toggle")?.getAttribute("aria-expanded") === "false");
    assert.equal(await page.locator("#mobile-menu-toggle").getAttribute("aria-expanded"), "false");
    await page.locator("#mobile-navigation").waitFor({ state: "hidden" });
  }
  if (path.startsWith("/blog?")) {
    assert.equal(await page.locator(".blog-grid > .content-post-card").count(), 12);
    if (path.includes("pagina=2")) assert.match(await page.locator('.blog-pagination [aria-current="page"]').innerText(), /2/);
    if (path.includes("q=alcohol")) assert.equal(await page.locator('.blog-search input').inputValue(), "alcohol");
  }
  if (path === "/preguntas-frecuentes") {
    await page.getByRole("button", { name: "¿Cuánto cuesta la evaluación inicial?" }).click();
    assert(await page.getByText("La evaluación inicial tiene un valor de $35.000 CLP.", { exact: true }).isVisible());
  }
  if (["/", "/equipo", "/equipo/marcelo-montiel", "/tratamiento", "/blog"].includes(path)) await page.screenshot({ path: join(out, `${path.replaceAll("/", "-") || "home"}-${width}.png`), fullPage: true });
  results.push({ path, width, status: "PASS", ...metrics });
  console.log(`PASS ${path} @ ${width}`);
  await page.close();
}
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CMS_QA_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const publicContext = await browser.newContext();
  if (!process.env.CMS_QA_SKIP_PUBLIC) for (const width of [1440, 375]) for (const path of ["/", "/instituto", "/acompanamiento", "/tratamiento", "/recovery-40", "/nuestro-enfoque", "/familias", "/equipo", "/equipo/marcelo-montiel", "/preguntas-frecuentes", "/contacto", "/blog", "/blog?pagina=2", "/blog?q=alcohol", "/blog?q=alcohol&pagina=2", "/blog/tipos-de-terapias-en-tratamiento-de-adicciones", "/blog/alcohol-y-conduccion"]) await inspect(publicContext, path, width);
  const guard = await publicContext.newPage(); await guard.goto(`${base}/admin/paginas`); assert.match(guard.url(), /\/admin\/login/); await guard.close();
  const admins = checkDb(await service.from("admin_users").select("user_id").eq("role", "superadmin").eq("is_active", true).limit(1));
  assert(admins[0], "No active superadmin available for authenticated QA");
  const user = checkDb(await service.auth.admin.getUserById(admins[0].user_id)).user;
  // Generate a local QA login without sending any email or changing the password.
  const generated = checkDb(await service.auth.admin.generateLink({ type: "magiclink", email: user.email }));
  const cookieJar = new Map();
  sessionClient = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => [...cookieJar.values()].map(({ name, value }) => ({ name, value })), setAll: (cookies) => cookies.forEach((cookie) => cookieJar.set(cookie.name, cookie)) } });
  checkDb(await sessionClient.auth.verifyOtp({ token_hash: generated.properties.hashed_token, type: "magiclink" }));
  const adminContext = await browser.newContext();
  await adminContext.addCookies([...cookieJar.values()].map(({ name, value }) => ({ name, value, url: base, sameSite: "Lax" })));
  const pages = checkDb(await service.from("cms_pages").select("*").eq("slug", "tratamiento"));
  const person = checkDb(await service.from("professionals").select("id").eq("slug", "marcelo-montiel"))[0];
  const firstPost = checkDb(await service.from("content_posts").select("id").eq("slug", "alcohol-y-conduccion").limit(1))[0];
  if (!process.env.CMS_QA_SKIP_INSPECTION) for (const width of [1440, 375]) for (const path of ["/admin", "/admin/noticias", "/admin/contenidos/nuevo", `/admin/contenidos/${firstPost.id}/editar`, "/admin/paginas", `/admin/paginas/${pages[0].id}`, `/admin/paginas/${pages[0].id}/vista-previa`, "/admin/equipo", "/admin/equipo/nuevo", `/admin/equipo/${person.id}`, `/admin/equipo/${person.id}/vista-previa`, "/admin/configuracion"]) await inspect(adminContext, path, width, true);
  // A draft clone exercises real page saving without changing live institutional copy.
  const sourcePage = pages[0];
  const clone = checkDb(await service.from("cms_pages").insert({ slug: `cms-qa-${Date.now()}`, path: `/cms-qa-${Date.now()}`, title: "CMS QA (borrador)", nav_label: "CMS QA", status: "draft", show_in_navigation: false }).select("*").single());
  fixtures.pages.push(clone.id);
  const sections = checkDb(await service.from("cms_page_sections").select("section_type,data,sort_order,is_enabled").eq("page_id", sourcePage.id));
  checkDb(await service.from("cms_page_sections").insert(sections.map((section) => ({ ...section, page_id: clone.id }))));
  const editor = await adminContext.newPage(); await editor.goto(`${base}/admin/paginas/${clone.id}`, { waitUntil: "networkidle" });
  await editor.getByLabel("Título de página", { exact: true }).fill("CMS QA editado");
  const blockDetails = editor.locator("form.admin-form details"); await blockDetails.nth(1).locator("summary").click();
  await blockDetails.nth(1).getByLabel("Destino de tarjeta (opcional)", { exact: true }).first().fill("/familias");
  await blockDetails.nth(1).getByRole("button", { name: "Bajar bloque", exact: true }).click();
  await blockDetails.nth(2).getByLabel("Bloque activo", { exact: true }).uncheck();
  await submitAndWait(editor, "Guardar borrador"); await editor.getByText("Cambios guardados correctamente.", { exact: true }).waitFor();
  const saved = checkDb(await service.from("cms_pages").select("title,status").eq("id", clone.id).single());
  assert.equal(saved.title, "CMS QA editado"); assert.equal(saved.status, "draft");
  const savedCards = checkDb(await service.from("cms_page_sections").select("data").eq("page_id", clone.id).eq("section_type", "feature_cards").single());
  assert.equal(savedCards.data.items[0].href, "/familias");
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  assert.equal(checkDb(await anon.from("cms_pages").select("id").eq("id", clone.id)).length, 0);
  assert.equal(checkDb(await anon.from("cms_page_sections").select("id").eq("page_id", clone.id)).length, 0);
  results.push({ path: "CMS save draft + reorder + private preview", status: "PASS" });
  await inspect(adminContext, `/admin/paginas/${clone.id}/vista-previa`, 375, true);
  const privatePreview = await publicContext.newPage(); await privatePreview.goto(`${base}/admin/paginas/${clone.id}/vista-previa`); assert.match(privatePreview.url(), /\/admin\/login/); await privatePreview.close();
  // Professional creation and rich editor use the actual Server Action, always draft.
  await editor.goto(`${base}/admin/equipo/nuevo`, { waitUntil: "networkidle" });
  const slug = `cms-qa-professional-${Date.now()}`;
  fixtures.personSlugs.push(slug);
  await editor.getByLabel("Nombre completo", { exact: true }).fill("Profesional QA (borrador)");
  await editor.getByLabel("Slug", { exact: true }).fill(slug);
  await editor.getByLabel("Cargo principal", { exact: true }).fill("Prueba técnica");
  await editor.getByLabel("Cargar o reemplazar imagen", { exact: true }).setInputFiles({ name: "cms-qa.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") });
  await editor.getByText("Imagen cargada. Guarda el contenido para asociarla.", { exact: true }).waitFor();
  await editor.getByLabel("Alt de fotografía", { exact: true }).fill("Imagen técnica de prueba");
  await submitAndWait(editor, "Guardar borrador"); const createdPerson = checkDb(await service.from("professionals").select("id,status").eq("slug", slug).single()); fixtures.people.push(createdPerson.id);
  assert.equal(createdPerson.status, "draft");
  const uploadedPerson = checkDb(await service.from("professionals").select("profile_image_url").eq("id", createdPerson.id).single());
  fixtures.storage.push(uploadedPerson.profile_image_url.replace("/api/public/media/content/", ""));
  assert.equal((await publicContext.request.get(`${base}${uploadedPerson.profile_image_url}`)).status(), 404, "Draft photo leaked");
  await inspect(adminContext, `/admin/equipo/${createdPerson.id}/vista-previa`, 375, true);
  const draftResponse = await publicContext.request.get(`${base}/equipo/${slug}`); assert.equal(draftResponse.status(), 404);
  await editor.getByLabel("Orden del profesional", { exact: true }).fill("9"); await editor.getByLabel("Destacado en Inicio", { exact: true }).check();
  await submitAndWait(editor, "Guardar cambios"); await editor.getByText("Perfil guardado correctamente.", { exact: true }).waitFor();
  assert.equal(checkDb(await service.from("professionals").select("sort_order").eq("id", createdPerson.id).single()).sort_order, 9);
  results.push({ path: "Professional create/edit/order + draft profile 404", status: "PASS" });
  // Regression: create and edit a local Noticias draft with the existing rich editor.
  await editor.goto(`${base}/admin/contenidos/nuevo`, { waitUntil: "networkidle" });
  const postSlug = `cms-qa-news-${Date.now()}`;
  fixtures.postSlugs.push(postSlug);
  await editor.getByLabel("Título", { exact: true }).fill("Noticia QA (borrador)"); await editor.getByLabel("Slug", { exact: true }).fill(postSlug);
  await editor.getByLabel("Extracto / bajada", { exact: true }).fill("Noticia de prueba técnica del editor existente, conservada como borrador.");
  await editor.locator(".tiptap[contenteditable=true]").fill("Contenido editorial de prueba técnica para regresión del CMS.");
  await submitAndWait(editor, "Crear contenido");
  const createdPost = checkDb(await service.from("content_posts").select("id,status").eq("slug", postSlug).single()); fixtures.posts.push(createdPost.id); assert.equal(createdPost.status, "draft");
  await editor.goto(`${base}/admin/contenidos/${createdPost.id}/editar`, { waitUntil: "domcontentloaded" }); await editor.getByLabel("SEO title", { exact: true }).fill("Noticia QA editada"); await submitAndWait(editor, "Guardar cambios");
  assert.equal(checkDb(await service.from("content_posts").select("seo_title").eq("id", createdPost.id).single()).seo_title, "Noticia QA editada");
  results.push({ path: "Noticias create/edit regression", status: "PASS" });
  await editor.close();
  await writeFile(join(out, "results.json"), JSON.stringify({ status: "PASS", checks: results }, null, 2));
  console.log(`PASS: ${results.length} browser checks including public/admin desktop/mobile and real draft saves. No QA copy published.`);
} finally {
  for (const slug of fixtures.personSlugs) { const people = checkDb(await service.from("professionals").select("id,profile_image_url").eq("slug", slug)); for (const person of people) { if (!fixtures.people.includes(person.id)) fixtures.people.push(person.id); if (person.profile_image_url) fixtures.storage.push(person.profile_image_url.replace("/api/public/media/content/", "")); } }
  for (const slug of fixtures.postSlugs) { const posts = checkDb(await service.from("content_posts").select("id").eq("slug", slug)); for (const post of posts) if (!fixtures.posts.includes(post.id)) fixtures.posts.push(post.id); }
  for (const id of fixtures.posts) checkDb(await service.from("content_posts").delete().eq("id", id));
  for (const id of fixtures.people) checkDb(await service.from("professionals").delete().eq("id", id));
  for (const id of fixtures.pages) checkDb(await service.from("cms_pages").delete().eq("id", id));
  if (fixtures.storage.length) checkDb(await service.storage.from("content-images").remove([...new Set(fixtures.storage)]));
  await writeFile(join(out, "latest-checks.json"), JSON.stringify({ checks: results }, null, 2));
  if (sessionClient) await sessionClient.auth.signOut({ scope: "local" });
  if (browser) await browser.close();
}
