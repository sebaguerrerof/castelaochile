import { z } from "zod";

const text = z.string().trim().max(5000);
const title = z.string().trim().min(1).max(200);
export const statusSchema = z.enum(["draft", "published", "archived"]);
export const safeHref = z.string().trim().max(1000).refine((value) => /^\/(?!\/)[a-zA-Z0-9/_?#=&%.:-]*$/.test(value) || /^https:\/\/[^\s<>"\\]+$/.test(value), "Usa una ruta interna o URL https segura.");
export const mediaSrcSchema = z.string().refine((value) => /^\/images\/[a-zA-Z0-9._/-]+$/.test(value) || /^\/api\/public\/media\/content\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(value), "Selecciona una imagen de la biblioteca o carga una fotografía.");
const image = z.object({ src: mediaSrcSchema, alt: z.string().trim().min(1).max(200) }).strict();
const cta = z.object({ label: title, target: z.enum(["evaluation", "whatsapp", "custom"]), href: safeHref.optional() }).strict().refine((value) => value.target !== "custom" || !!value.href, "El CTA personalizado necesita un destino.");
const base = { title, description: text.default("") };
const item = z.object({ title, description: text.default(""), href: z.union([safeHref, z.literal("")]).optional() }).strict();
const cards = z.object({ ...base, items: z.array(item).min(1).max(30) }).strict();
export const blockSchemas = {
  hero: z.object({ ...base, eyebrow: text.default(""), image: image.optional(), primaryCta: cta.optional(), secondaryCta: cta.optional(), variant: z.enum(["blue", "mist", "warm"]).default("blue") }).strict(),
  rich_text: z.object({ ...base, html: z.string().max(50000) }).strict(),
  text_image: z.object({ ...base, html: z.string().max(50000), image }).strict(),
  feature_cards: cards,
  principles: cards,
  steps: cards,
  stats: z.object({ ...base, items: z.array(z.object({ value: title, label: title }).strict()).min(1).max(12) }).strict(),
  pricing: z.object({ ...base, items: z.array(z.object({ title, price: z.number().int().nonnegative().max(100000000), unit: text, note: text.default("") }).strict()).min(1).max(10) }).strict(),
  cta: z.object({ ...base, primaryCta: cta, secondaryCta: cta.optional() }).strict(),
  warning: z.object(base).strict(),
  faq: z.object({ ...base, items: z.array(z.object({ question: title, answer: text.min(1), category: text.default(""), is_enabled: z.boolean().default(true) }).strict()).min(1).max(80) }).strict(),
  team_preview: z.object({ ...base, featuredOnly: z.boolean().default(false) }).strict(),
  gallery: z.object({ ...base, images: z.array(image).min(1).max(20) }).strict(),
  contact: z.object(base).strict(),
} as const;
export type BlockType = keyof typeof blockSchemas;
export type BlockData<K extends BlockType> = z.infer<(typeof blockSchemas)[K]>;
export type CmsBlock = { [K in BlockType]: { id: string; section_type: K; data: BlockData<K>; sort_order: number; is_enabled: boolean } }[BlockType];
const sectionBase = { id: z.uuid(), sort_order: z.number().int().min(0).max(100), is_enabled: z.boolean() };
export const blockSchema = z.discriminatedUnion("section_type", [
  z.object({ ...sectionBase, section_type: z.literal("hero"), data: blockSchemas.hero }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("rich_text"), data: blockSchemas.rich_text }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("text_image"), data: blockSchemas.text_image }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("feature_cards"), data: blockSchemas.feature_cards }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("principles"), data: blockSchemas.principles }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("steps"), data: blockSchemas.steps }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("stats"), data: blockSchemas.stats }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("pricing"), data: blockSchemas.pricing }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("cta"), data: blockSchemas.cta }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("warning"), data: blockSchemas.warning }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("faq"), data: blockSchemas.faq }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("team_preview"), data: blockSchemas.team_preview }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("gallery"), data: blockSchemas.gallery }).strict(),
  z.object({ ...sectionBase, section_type: z.literal("contact"), data: blockSchemas.contact }).strict(),
]);
export const pageEditSchema = z.object({
  id: z.uuid(), updated_at: z.iso.datetime({ offset: true }), title, nav_label: title,
  status: statusSchema, seo_title: z.string().trim().max(70), seo_description: z.string().trim().max(170),
  og_image_url: z.union([mediaSrcSchema, z.literal("")]), show_in_navigation: z.boolean(), navigation_order: z.number().int().min(0).max(100),
  sections: z.array(blockSchema).min(1).max(40),
}).strict().superRefine((page, context) => {
  if (new Set(page.sections.map((section) => section.id)).size !== page.sections.length) context.addIssue({ code: "custom", path: ["sections"], message: "Hay bloques duplicados." });
  const enabled = page.sections.filter((section) => section.is_enabled).sort((a, b) => a.sort_order - b.sort_order);
  if (enabled.filter((section) => section.section_type === "hero").length !== 1 || enabled[0]?.section_type !== "hero") context.addIssue({ code: "custom", path: ["sections"], message: "Debe existir un único Hero activo al inicio." });
});
const optionalUrl = z.union([safeHref, z.literal("")]);
export const professionalSchema = z.object({
  full_name: title, slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(160), role: title,
  credentials: z.array(z.string().trim().min(1).max(200)).max(20), short_bio: z.string().max(500),
  bio: z.string().max(50000), professional_experience: z.string().max(50000), recovery_experience: z.string().max(50000),
  featured_quote: text, media: text, conferences: text,
  profile_image_url: z.union([mediaSrcSchema, z.literal("")]), profile_image_alt: z.string().max(200),
  email: z.union([z.email(), z.literal("")]), phone: z.string().regex(/^(?:\+?\d{7,15})?$/), linkedin_url: optionalUrl, instagram_url: optionalUrl,
  cta_label: z.string().max(200), cta_url: optionalUrl, status: statusSchema,
  is_featured: z.boolean(), sort_order: z.number().int().min(0).max(10000),
  seo_title: z.string().max(70), seo_description: z.string().max(170),
}).strict().refine((value) => !value.profile_image_url || !!value.profile_image_alt.trim(), { path: ["profile_image_alt"], message: "La fotografía necesita texto alternativo." }).refine((value) => !value.cta_label || !!value.cta_url, { path: ["cta_url"], message: "Indica el destino del CTA." });
export type ProfessionalData = z.infer<typeof professionalSchema>;
export const settingsSchema = z.object({
  whatsapp: z.string().regex(/^(?:\+569\d{8})?$/), phone: z.string().regex(/^(?:\+?\d{7,15})?$/), email: z.union([z.email(), z.literal("")]),
  streetAddress: z.string().max(500), city: z.string().max(100), region: z.string().max(100), country: z.string().max(100),
  mapsUrl: optionalUrl, instagram: optionalUrl, facebook: optionalUrl, linkedin: optionalUrl,
  evaluationUrl: safeHref, evaluationLabel: title, footerNotice: text.min(1),
}).strict();
export type SiteSettings = z.infer<typeof settingsSchema>;

export function parsePublicSections(rows: unknown[]): CmsBlock[] {
  return rows.flatMap((row) => { const parsed = blockSchema.safeParse(row); return parsed.success && parsed.data.is_enabled ? [parsed.data] : []; }).sort((a, b) => a.sort_order - b.sort_order);
}
