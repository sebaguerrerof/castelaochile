import type { Json } from "./database";
import type { ProfessionalData, SiteSettings } from "../lib/cms/schemas";

export type CmsPageRow = {
  id: string; slug: string; path: string; title: string; nav_label: string; status: "draft" | "published" | "archived";
  seo_title: string; seo_description: string; og_image_url: string; show_in_navigation: boolean; navigation_order: number;
  published_at: string | null; created_at: string; updated_at: string; updated_by: string | null;
};
export type CmsSectionRow = { id: string; page_id: string; section_type: string; data: Json; sort_order: number; is_enabled: boolean };
export type ProfessionalRow = ProfessionalData & { id: string; created_at: string; updated_at: string; updated_by: string | null };
export type SettingsRow = { id: string; data: SiteSettings; updated_at: string; updated_by: string | null };
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type CmsTables = { cms_pages: Table<CmsPageRow>; cms_page_sections: Table<CmsSectionRow>; professionals: Table<ProfessionalRow>; site_settings: Table<SettingsRow> };
