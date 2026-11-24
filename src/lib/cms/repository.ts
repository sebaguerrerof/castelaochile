import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { contactConfig } from "@/config/contact";
import { blockSchema, parsePublicSections, professionalSchema, settingsSchema } from "@/lib/cms/schemas";
import type { CmsBlock, SiteSettings } from "@/lib/cms/schemas";
import type { CmsPageRow, ProfessionalRow } from "@/types/cms";
import { legacyNavigationGroup } from "./routing";

export type CmsPage = CmsPageRow & { sections: CmsBlock[] };
export const getCmsPage = cache(async (slug: string, preview = false): Promise<CmsPage | null> => {
  if (preview) await requireAdmin();
  const client = await createServerSupabaseClient();
  let query = client.from("cms_pages").select("*").eq("slug", slug);
  if (!preview) query = query.eq("status", "published");
  const { data: page, error } = await query.maybeSingle();
  if (error) throw new Error("No fue posible cargar la página CMS.");
  if (!page) return null;
  if (preview) {
    const editable = await getEditablePage(page.id);
    return editable ? { ...editable, sections: parsePublicSections(editable.sections) } : null;
  }
  const { data: sections, error: sectionError } = await client.from("cms_page_sections").select("id, section_type, data, sort_order, is_enabled").eq("page_id", page.id).order("sort_order");
  if (sectionError) throw new Error("No fue posible cargar los bloques.");
  return { ...page, sections: parsePublicSections(sections) };
});
export async function listAdminPages() {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("cms_pages").select("*").order("navigation_order");
  if (error) throw new Error("No fue posible cargar Páginas. Revisa la migración CMS.");
  const { data: drafts, error: draftError } = await client.from("cms_editorial_drafts").select("resource_id").eq("kind", "page");
  if (draftError) throw new Error("No fue posible cargar los borradores editoriales.");
  return data.map(page => ({ ...page, has_draft: drafts.some(draft => draft.resource_id === page.id) }));
}
export async function getEditablePage(id: string) {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  const { data: page, error } = await client.from("cms_pages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("No fue posible cargar la página.");
  if (!page) return null;
  const { data, error: sectionsError } = await client.from("cms_page_sections").select("id, section_type, data, sort_order, is_enabled").eq("page_id", id).order("sort_order");
  if (sectionsError) throw new Error("No fue posible cargar los bloques.");
  const { data: draft, error: draftError } = await client.from("cms_editorial_drafts").select("data,updated_at,base_updated_at").eq("kind", "page").eq("resource_id", id).maybeSingle();
  if (draftError) throw new Error("No fue posible cargar el borrador editorial.");
  const rows = (draft?.data as { sections?: typeof data } | null)?.sections ?? data;
  const sections = rows.map(row => { const parsed = blockSchema.safeParse(row); return parsed.success ? parsed.data : row; });
  return { ...page, ...(draft?.data as object ?? {}), id: page.id, slug: page.slug, public_status: page.status, updated_at: draft?.base_updated_at ?? page.updated_at, draft_updated_at: draft?.updated_at ?? null, sections };
}
export const listProfessionals = cache(async (preview = false): Promise<ProfessionalRow[]> => {
  if (preview) await requireAdmin();
  const client = await createServerSupabaseClient();
  let query = client.from("professionals").select("*").order("sort_order").order("full_name");
  if (!preview) query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) throw new Error("No fue posible cargar el equipo.");
  const drafts = preview ? await client.from("cms_editorial_drafts").select("resource_id,data,updated_at,base_updated_at").eq("kind", "professional") : { data: [], error: null };
  if (drafts.error) throw new Error("No fue posible cargar los borradores del equipo.");
  return data.map(row => { const draft = drafts.data?.find(item => item.resource_id === row.id); return { ...row, ...(draft?.data as object ?? {}), id: row.id, updated_at: draft?.base_updated_at ?? row.updated_at, public_status: row.status, draft_updated_at: draft?.updated_at ?? null }; })
    .filter((row) => professionalSchema.safeParse(Object.fromEntries(Object.entries(row).filter(([key]) => !["id", "created_at", "updated_at", "updated_by", "draft_updated_at", "public_status"].includes(key)))).success);
});
export async function getProfessional(value: string, preview = false, byId = false) {
  return (await listProfessionals(preview)).find((row) => (byId ? row.id : row.slug) === value) ?? null;
}
export const getSiteSettings = cache(async (preview = false): Promise<SiteSettings> => {
  if (preview) await requireAdmin();
  const fallback = settingsSchema.parse({ whatsapp: contactConfig.whatsapp ?? "", phone: contactConfig.phone ?? "", email: contactConfig.email ?? "", streetAddress: contactConfig.streetAddress ?? "", city: contactConfig.city ?? "", region: contactConfig.region ?? "", country: contactConfig.country ?? "", mapsUrl: contactConfig.mapsUrl ?? "", instagram: contactConfig.socialLinks.instagram ?? "", facebook: contactConfig.socialLinks.facebook ?? "", linkedin: contactConfig.socialLinks.linkedin ?? "", evaluationUrl: "/contacto", evaluationLabel: "Agendar evaluación", footerNotice: "La información de este sitio es de carácter general y no sustituye una evaluación profesional individual." });
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("site_settings").select("data").eq("id", "global").maybeSingle();
  if (error) throw new Error("No fue posible cargar la configuración institucional.");
  const draft = preview ? await client.from("cms_editorial_drafts").select("data").eq("kind", "settings").eq("resource_id", "global").maybeSingle() : { data: null, error: null };
  if (draft.error) throw new Error("No fue posible cargar la configuración de revisión.");
  const parsed = settingsSchema.safeParse(draft.data?.data ?? data?.data);
  return parsed.success ? parsed.data : fallback;
});
export function settingsContact(settings: SiteSettings) {
  return { ...contactConfig, whatsapp: settings.whatsapp || null, phone: settings.phone || null, email: settings.email || null, streetAddress: settings.streetAddress || null, mapsUrl: settings.mapsUrl || null, socialLinks: { instagram: settings.instagram || null, facebook: settings.facebook || null, linkedin: settings.linkedin || null } };
}
export const getCmsNavigation = cache(async () => {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("cms_pages").select("path, nav_label, navigation_group").eq("status", "published").eq("show_in_navigation", true).order("navigation_order");
  if (error) throw new Error("No fue posible cargar la navegación.");
  const settings = await getSiteSettings();
  const pages = data.map(page => ({ href: page.path, label: page.nav_label, groupId: page.navigation_group || legacyNavigationGroup(page.path) }));
  return [...pages, ...settings.navigationLinks.filter(link => link.enabled && !pages.some(page => page.href === link.href)).map(link => ({ href: link.href, label: link.label, groupId: link.groupId }))];
});

export async function getSettingsEditorState() {
  await requireAdmin(["editor", "superadmin"]);
  const client = await createServerSupabaseClient();
  const current = await client.from("site_settings").select("updated_at").eq("id", "global").single();
  const draft = await client.from("cms_editorial_drafts").select("updated_at,base_updated_at").eq("kind", "settings").eq("resource_id", "global").maybeSingle();
  if (current.error || draft.error) throw new Error("No fue posible cargar la versión de configuración.");
  return { settings: await getSiteSettings(true), updated_at: draft.data?.base_updated_at ?? current.data.updated_at, draft_updated_at: draft.data?.updated_at ?? null };
}
export async function getCmsPageByPath(path: string) {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("cms_pages").select("slug").eq("path", path).eq("status", "published").maybeSingle();
  if (error) throw new Error("No fue posible cargar la ruta.");
  return data ? getCmsPage(data.slug) : null;
}
export async function getCmsRedirect(path: string) {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("cms_redirects").select("page_id").eq("source_path", path).maybeSingle();
  if (error) throw new Error("No fue posible comprobar la redirección.");
  if (!data) return null;
  const target = await client.from("cms_pages").select("path").eq("id", data.page_id).eq("status", "published").maybeSingle();
  if (target.error) throw new Error("No fue posible cargar el destino.");
  return target.data?.path !== path ? target.data?.path ?? null : null;
}
export async function listCmsSitemap() {
  const client = await createServerSupabaseClient();
  const [{ data: pages, error }, professionals] = await Promise.all([client.from("cms_pages").select("path, updated_at").eq("status", "published"), listProfessionals()]);
  if (error) throw new Error("No fue posible cargar sitemap CMS.");
  return [...pages, ...professionals.map((person) => ({ path: `/equipo/${person.slug}`, updated_at: person.updated_at }))];
}
