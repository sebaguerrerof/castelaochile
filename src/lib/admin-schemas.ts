import { z } from "zod";

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones.");
const emptyToNull = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

export const contentPostSchema = z.object({
  id: z.preprocess(emptyToNull, z.string().uuid().nullable()), kind: z.enum(["blog", "news"]), slug,
  title: z.string().trim().min(3).max(160), summary: z.string().trim().min(10).max(320),
  contentHtml: z.string().trim().min(1, "Agrega contenido a la publicación.").max(100_000),
  authorName: z.string().trim().min(2).max(160),
  categoryIds: z.array(z.string().uuid()).max(20),
  coverImagePath: z.preprocess(emptyToNull, z.string().max(500).nullable()),
  coverAlt: z.preprocess(emptyToNull, z.string().min(3).max(160).nullable()),
  publishedAt: z.preprocess(emptyToNull, z.iso.datetime({ offset: true }).nullable()),
  seoTitle: z.preprocess(emptyToNull, z.string().min(3).max(70).nullable()),
  seoDescription: z.preprocess(emptyToNull, z.string().min(10).max(170).nullable()),
  status: z.enum(["draft", "published", "archived"]),
}).superRefine((value, context) => {
  if (value.coverImagePath && !value.coverAlt) context.addIssue({ code: "custom", path: ["coverAlt"], message: "Agrega texto alternativo para la imagen." });
});
export const consultationStatusSchema = z.enum(["new", "in_progress", "closed", "spam"]);
export const noteSchema = z.string().trim().min(1).max(2_000).refine((value) => !/[<>]/.test(value), "Las notas no admiten HTML.");
export const staffInviteSchema = z.object({ email: z.email().trim().toLowerCase(), role: z.enum(["superadmin", "editor", "viewer"]) });
export const staffUpdateSchema = z.object({ userId: z.string().uuid(), role: z.enum(["superadmin", "editor", "viewer"]), active: z.boolean() });
export function formDataRecord(formData: FormData) { return Object.fromEntries(formData.entries()); }
