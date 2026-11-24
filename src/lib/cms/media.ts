import "server-only";
import { getAdminContext } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function containsMedia(value: unknown, url: string): boolean {
  if (typeof value === "string") return value === url || value.includes(`src="${url}"`);
  if (Array.isArray(value)) return value.some((item) => containsMedia(item, url));
  if (value && typeof value === "object") return Object.values(value).some((item) => containsMedia(item, url));
  return false;
}
export async function canReadCmsMedia(path: string) {
  const client = await createServerSupabaseClient();
  const staff = await getAdminContext();
  const url = `/api/public/media/content/${path}`;
  let pageQuery = client.from("cms_pages").select("id, og_image_url");
  let personQuery = client.from("professionals").select("profile_image_url, bio, professional_experience, recovery_experience");
  if (!staff) { pageQuery = pageQuery.eq("status", "published"); personQuery = personQuery.eq("status", "published"); }
  const [{ data: pages, error }, { data: people, error: peopleError }] = await Promise.all([pageQuery, personQuery]);
  if (error || peopleError) return false;
  if (pages.some((page) => page.og_image_url === url) || people.some((person) => containsMedia(person, url))) return true;
  if (!pages.length) return false;
  let sections = client.from("cms_page_sections").select("data").in("page_id", pages.map((page) => page.id));
  if (!staff) sections = sections.eq("is_enabled", true);
  const { data, error: sectionError } = await sections;
  return !sectionError && data.some((section) => containsMedia(section.data, url));
}
