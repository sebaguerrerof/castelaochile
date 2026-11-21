"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { pageCreateSchema, pageEditSchema, professionalSchema, settingsSchema } from "@/lib/cms/schemas";
import { sanitizeBlogHtml } from "@/lib/blog/content";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AdminActionState } from "@/lib/admin-action-state";
import type { Json } from "@/types/database";

function failure(error: z.ZodError): AdminActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) { const field = issue.path.join(" → ") || "Formulario"; fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message]; }
  return { status: "error", message: "Revisa los campos indicados.", fieldErrors };
}
function payload(form: FormData): unknown {
  const raw = form.get("payload");
  if (typeof raw !== "string" || raw.length > 900000) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function editorialError(code?: string): AdminActionState {
  return { status: "error", message: code === "40001" ? "Otra persona modificó el contenido o su borrador. Recarga antes de guardar." : code === "23505" ? "La ruta o el identificador ya está en uso." : "No se guardaron los cambios. Revisa los campos y tu sesión." };
}
export async function createEditorialPage(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requireAdmin(["editor", "superadmin"]);
  const parsed = pageCreateSchema.safeParse({ title: form.get("title"), path: form.get("path") });
  if (!parsed.success) return failure(parsed.error);
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_editorial_page", { p_title: parsed.data.title, p_path: parsed.data.path });
  if (error) return editorialError(error.code);
  revalidatePath("/admin/paginas");
  redirect(`/admin/paginas/${data}?success=created`);
}
export async function saveCmsPage(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requireAdmin(["editor", "superadmin"]);
  const input = payload(form);
  const intent = form.get("intent");
  const parsed = pageEditSchema.safeParse(typeof input === "object" && input ? { ...input, ...(intent === "draft" || intent === "published" ? { status: intent } : {}) } : null);
  if (!parsed.success) return failure(parsed.error);
  const page = parsed.data;
  page.sections = page.sections.map((block, index) => {
    if (block.section_type === "rich_text" || block.section_type === "text_image") block.data.html = sanitizeBlogHtml(block.data.html);
    return { ...block, sort_order: index };
  });
  const client = await createServerSupabaseClient();
  const { error } = await client.rpc("save_editorial_content", { p_kind: "page", p_id: page.id, p_data: page as unknown as Json, p_base_updated_at: page.updated_at, p_draft_updated_at: page.draft_updated_at ?? null, p_publish: page.status !== "draft" });
  if (error) return editorialError(error.code);
  revalidatePath("/", "layout"); revalidatePath("/sitemap.xml");
  redirect(`/admin/paginas/${page.id}?success=saved`);
}
export async function withdrawCmsPage(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requireAdmin(["editor", "superadmin"]);
  const id = z.uuid().safeParse(form.get("id"));
  const base = z.iso.datetime({ offset: true }).safeParse(form.get("updated_at"));
  const draft = form.get("draft_updated_at");
  if (!id.success || !base.success || (draft && !z.iso.datetime({ offset: true }).safeParse(draft).success)) return { status: "error", message: "Identificador o versión inválidos. Recarga el formulario." };
  const client = await createServerSupabaseClient();
  const { error } = await client.rpc("withdraw_editorial_page", { p_id: id.data, p_base_updated_at: base.data, p_draft_updated_at: typeof draft === "string" && draft ? draft : null });
  if (error) return editorialError(error.code);
  revalidatePath("/", "layout"); revalidatePath("/sitemap.xml");
  redirect(`/admin/paginas/${id.data}?success=withdrawn`);
}
export async function saveProfessional(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requireAdmin(["editor", "superadmin"]);
  const id = String(form.get("id") ?? ""); const updatedAt = String(form.get("updated_at") ?? "");
  if (id && (!z.uuid().safeParse(id).success || !z.iso.datetime({ offset: true }).safeParse(updatedAt).success)) return { status: "error", message: "Identificador inválido. Recarga el formulario." };
  const input = payload(form); const intent = form.get("intent");
  const parsed = professionalSchema.safeParse(typeof input === "object" && input ? { ...input, ...(intent === "draft" || intent === "published" ? { status: intent } : {}) } : null);
  if (!parsed.success) return failure(parsed.error);
  const person = { ...parsed.data, bio: sanitizeBlogHtml(parsed.data.bio), professional_experience: sanitizeBlogHtml(parsed.data.professional_experience), recovery_experience: sanitizeBlogHtml(parsed.data.recovery_experience) };
  const client = await createServerSupabaseClient();
  let resourceId = id;
  let baseVersion = updatedAt;
  if (!resourceId) {
    const created = await client.from("professionals").insert({ ...person, status: "draft" }).select("id,updated_at").single();
    if (created.error) return editorialError(created.error.code);
    resourceId = created.data.id; baseVersion = created.data.updated_at;
  }
  const draftVersion = form.get("draft_updated_at");
  if (draftVersion && !z.iso.datetime({ offset: true }).safeParse(draftVersion).success) return { status: "error", message: "Versión de borrador inválida." };
  const result = await client.rpc("save_editorial_content", { p_kind: "professional", p_id: resourceId, p_data: person as unknown as Json, p_base_updated_at: baseVersion, p_draft_updated_at: typeof draftVersion === "string" && draftVersion ? draftVersion : null, p_publish: person.status !== "draft" });
  if (result.error) return editorialError(result.error.code);
  revalidatePath("/", "layout"); revalidatePath("/sitemap.xml");
  redirect(`/admin/equipo/${resourceId}?success=saved`);
}
export async function saveSiteSettings(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requireAdmin(["editor", "superadmin"]);
  const parsed = settingsSchema.safeParse(payload(form));
  if (!parsed.success) return failure(parsed.error);
  const client = await createServerSupabaseClient();
  const base = z.iso.datetime({ offset: true }).safeParse(form.get("updated_at"));
  const draft = form.get("draft_updated_at");
  if (!base.success || (draft && !z.iso.datetime({ offset: true }).safeParse(draft).success)) return { status: "error", message: "Recarga para obtener la versión actual de configuración." };
  const { error } = await client.rpc("save_editorial_content", { p_kind: "settings", p_id: "global", p_data: parsed.data as unknown as Json, p_base_updated_at: base.data, p_draft_updated_at: typeof draft === "string" && draft ? draft : null, p_publish: form.get("intent") === "published" });
  if (error) return editorialError(error.code);
  revalidatePath("/", "layout");
  redirect("/admin/configuracion?success=saved");
}
