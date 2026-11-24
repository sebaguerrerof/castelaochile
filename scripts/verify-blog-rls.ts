import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (process.env.BLOG_RLS_TEST_ALLOW !== "preview" || !url || !secret || !anonKey) {
  throw new Error("RLS verification is restricted to an explicitly configured preview branch.");
}

const admin = createClient(url, secret, { auth: { persistSession: false } });
const stamp = Date.now();
const email = `blog-rls-${stamp}@example.test`;
const password = `Rls-Test-${randomUUID()}!`;
let userId: string | null = null;
const postIds: string[] = [];
const result: Record<string, boolean> = {};

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("Could not create preview test user.");
  userId = created.data.user.id;
  const staff = await admin.from("admin_users").insert({ user_id: userId, role: "editor", is_active: true });
  if (staff.error) throw staff.error;
  const editor = createClient(url, anonKey, { auth: { persistSession: false } });
  const signed = await editor.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;

  const localId = randomUUID();
  postIds.push(localId);
  const local = await editor.from("content_posts").insert({
    id: localId, kind: "blog", slug: `rls-local-${stamp}`, title: "RLS local de prueba",
    summary: "Resumen suficientemente largo para validar la política local.", body: "Contenido local.",
    content_html: "<p>Contenido local.</p>", content_text: "Contenido local.", author_id: userId, author_name: "Editor test",
  });
  result.editorCreatesLocal = !local.error;

  const fake = await editor.from("content_posts").insert({
    id: randomUUID(), kind: "blog", slug: `rls-fake-${stamp}`, title: "RLS falso de prueba",
    summary: "Resumen suficientemente largo para validar un origen falso.", body: "Contenido falso.",
    content_html: "<p>Contenido falso.</p>", content_text: "Contenido falso.", author_id: userId, author_name: "Editor test",
    origin: "castelao_es", source_post_id: `fake-${stamp}`, source_url: "https://www.institutocastelao.com/fake/",
    source_hash: "a".repeat(64), source_updated_at: new Date().toISOString(), synced_at: new Date().toISOString(),
  });
  result.editorCannotFakeSpain = Boolean(fake.error);

  const synchronizedId = randomUUID();
  postIds.push(synchronizedId);
  const synchronized = await admin.from("content_posts").insert({
    id: synchronizedId, kind: "blog", slug: `rls-sync-${stamp}`, title: "RLS sync de prueba",
    summary: "Resumen suficientemente largo para validar el contenido sincronizado.", body: "Contenido sincronizado.",
    content_html: "<p>Contenido sincronizado.</p>", content_text: "Contenido sincronizado.", author_name: "Equipo Castelao",
    origin: "castelao_es", source_post_id: `rls-${stamp}`, source_url: `https://www.institutocastelao.com/rls-${stamp}/`,
    source_hash: "b".repeat(64), source_updated_at: new Date().toISOString(), synced_at: new Date().toISOString(),
    status: "published", published_at: new Date().toISOString(),
  });
  if (synchronized.error) throw synchronized.error;

  const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const visible = await publicClient.from("content_posts").select("id", { count: "exact", head: true }).eq("id", synchronizedId);
  result.anonReadsPublished = visible.count === 1;
  const sourceEdit = await editor.from("content_posts").update({ title: "Manipulado" }).eq("id", synchronizedId);
  result.editorCannotChangeSource = Boolean(sourceEdit.error);
  const override = await editor.from("content_posts").update({ status: "archived", seo_title: "SEO local permitido" }).eq("id", synchronizedId);
  result.editorCanOverrideStatusSeo = !override.error;
  const hidden = await publicClient.from("content_posts").select("id", { count: "exact", head: true }).eq("id", synchronizedId);
  result.archivedIsHidden = hidden.count === 0;

  if (Object.values(result).some((value) => !value)) throw new Error(`RLS verification failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (postIds.length) await admin.from("content_posts").delete().in("id", postIds);
  if (userId) {
    await admin.from("admin_users").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId, true);
  }
}
