"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { pageEditSchema, professionalSchema, settingsSchema } from "@/lib/cms/schemas";
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
  const { error } = await client.rpc("save_cms_page", { p_page: page as unknown as Json });
  if (error) return { status: "error", message: error.code === "40001" ? "Otra persona modificó esta página. Recarga antes de guardar para no sobrescribir sus cambios." : "No se guardaron los cambios. Revisa tu sesión y la migración CMS." };
  revalidatePath("/", "layout"); revalidatePath("/sitemap.xml");
  redirect(`/admin/paginas/${page.id}?success=saved`);
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
  const result = id ? await client.from("professionals").update(person).eq("id", id).eq("updated_at", updatedAt).select("id").maybeSingle() : await client.from("professionals").insert(person).select("id").single();
  if (result.error || !result.data) return { status: "error", message: result.error?.code === "23505" ? "El slug ya está en uso. Elige otro." : "No se guardó el perfil. Puede haber cambiado desde que lo abriste; recarga y verifica tu sesión." };
  revalidatePath("/", "layout"); revalidatePath("/sitemap.xml");
  redirect(`/admin/equipo/${result.data.id}?success=saved`);
}
export async function saveSiteSettings(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requireAdmin(["editor", "superadmin"]);
  const parsed = settingsSchema.safeParse(payload(form));
  if (!parsed.success) return failure(parsed.error);
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("site_settings").update({ data: parsed.data }).eq("id", "global").select("id").maybeSingle();
  if (error || !data) return { status: "error", message: "No fue posible guardar la configuración." };
  revalidatePath("/", "layout");
  redirect("/admin/configuracion?success=saved");
}
