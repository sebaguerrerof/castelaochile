import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { contactConfig } from "@/config/contact";
import { parsePublicSections, professionalSchema, settingsSchema } from "@/lib/cms/schemas";
import type { CmsBlock, SiteSettings } from "@/lib/cms/schemas";
import type { CmsPageRow, ProfessionalRow } from "@/types/cms";

export type CmsPage = CmsPageRow & { sections: CmsBlock[] };
export const getCmsPage = cache(async (slug: string, preview = false): Promise<CmsPage | null> => {
  if (preview) await requireAdmin();
  const client = await createServerSupabaseClient();
  let query = client.from("cms_pages").select("*").eq("slug", slug);
  if (!preview) query = query.eq("status", "published");
  const { data: page, error } = await query.maybeSingle();
  if (error) throw new Error("No fue posible cargar la página CMS.");
  if (!page) return null;
  const { data: sections, error: sectionError } = await client.from("cms_page_sections").select("id, section_type, data, sort_order, is_enabled").eq("page_id", page.id).order("sort_order");
  if (sectionError) throw new Error("No fue posible cargar los bloques.");
  return { ...page, sections: parsePublicSections(sections) };
});
export async function listAdminPages() {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("cms_pages").select("*").order("navigation_order");
  if (error) throw new Error("No fue posible cargar Páginas. Revisa la migración CMS.");
  return data;
}
export async function getEditablePage(id: string) {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  const { data: page, error } = await client.from("cms_pages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("No fue posible cargar la página.");
  if (!page) return null;
  const { data, error: sectionsError } = await client.from("cms_page_sections").select("id, section_type, data, sort_order, is_enabled").eq("page_id", id).order("sort_order");
  if (sectionsError) throw new Error("No fue posible cargar los bloques.");
  return { ...page, sections: data };
}
export const listProfessionals = cache(async (preview = false): Promise<ProfessionalRow[]> => {
  if (preview) await requireAdmin();
  const client = await createServerSupabaseClient();
  let query = client.from("professionals").select("*").order("sort_order").order("full_name");
  if (!preview) query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) throw new Error("No fue posible cargar el equipo.");
  return data.filter((row) => professionalSchema.safeParse(Object.fromEntries(Object.entries(row).filter(([key]) => !["id", "created_at", "updated_at", "updated_by"].includes(key)))).success);
});
export async function getProfessional(value: string, preview = false, byId = false) {
  return (await listProfessionals(preview)).find((row) => (byId ? row.id : row.slug) === value) ?? null;
}
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const fallback: SiteSettings = { whatsapp: contactConfig.whatsapp ?? "", phone: contactConfig.phone ?? "", email: contactConfig.email ?? "", streetAddress: contactConfig.streetAddress ?? "", city: contactConfig.city ?? "", region: contactConfig.region ?? "", country: contactConfig.country ?? "", mapsUrl: contactConfig.mapsUrl ?? "", instagram: contactConfig.socialLinks.instagram ?? "", facebook: contactConfig.socialLinks.facebook ?? "", linkedin: contactConfig.socialLinks.linkedin ?? "", evaluationUrl: "/contacto", evaluationLabel: "Agendar evaluación", footerNotice: "La información de este sitio es de carácter general y no sustituye una evaluación profesional individual." };
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("site_settings").select("data").eq("id", "global").maybeSingle();
  if (error) throw new Error("No fue posible cargar la configuración institucional.");
  const parsed = settingsSchema.safeParse(data?.data);
  return parsed.success ? parsed.data : fallback;
});
export function settingsContact(settings: SiteSettings) {
  return { ...contactConfig, whatsapp: settings.whatsapp || null, phone: settings.phone || null, email: settings.email || null, streetAddress: settings.streetAddress || null, mapsUrl: settings.mapsUrl || null, socialLinks: { instagram: settings.instagram || null, facebook: settings.facebook || null, linkedin: settings.linkedin || null } };
}
export const getCmsNavigation = cache(async () => {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("cms_pages").select("path, nav_label").eq("status", "published").eq("show_in_navigation", true).order("navigation_order");
  if (error) throw new Error("No fue posible cargar la navegación.");
  return [...data.map((page) => ({ href: page.path as `/${string}`, label: page.nav_label })), { href: "/blog" as const, label: "Blog" }];
});
export async function listCmsSitemap() {
  const client = await createServerSupabaseClient();
  const [{ data: pages, error }, professionals] = await Promise.all([client.from("cms_pages").select("path, updated_at").eq("status", "published"), listProfessionals()]);
  if (error) throw new Error("No fue posible cargar sitemap CMS.");
  return [...pages, ...professionals.map((person) => ({ path: `/equipo/${person.slug}`, updated_at: person.updated_at }))];
}
