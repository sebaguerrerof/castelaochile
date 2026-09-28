import { z } from "zod";

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones.");
const emptyToNull = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;

export const contentPostSchema = z.object({
  id: z.preprocess(emptyToNull, z.string().uuid().nullable()), kind: z.enum(["blog", "news"]), slug,
  title: z.string().trim().min(3).max(160), summary: z.string().trim().min(10).max(320),
  body: z.string().trim().min(1).max(50_000).refine((value) => !/[<>]/.test(value), "El contenido no admite HTML."),
  coverImagePath: z.preprocess(emptyToNull, z.string().max(500).nullable()), coverAlt: z.preprocess(emptyToNull, z.string().min(3).max(160).nullable()), status: z.enum(["draft", "published", "archived"]),
});
export const consultationStatusSchema = z.enum(["new", "in_progress", "closed", "spam"]);
export const noteSchema = z.string().trim().min(1).max(2_000).refine((value) => !/[<>]/.test(value), "Las notas no admiten HTML.");
export const staffInviteSchema = z.object({ email: z.email().trim().toLowerCase(), role: z.enum(["superadmin", "editor", "viewer"]) });
export const staffUpdateSchema = z.object({ userId: z.string().uuid(), role: z.enum(["superadmin", "editor", "viewer"]), active: z.boolean() });
export function formDataRecord(formData: FormData) { return Object.fromEntries(formData.entries()); }
