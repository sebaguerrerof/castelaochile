"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";

import { siteConfig } from "@/config/site";
import { contentPostSchema, consultationStatusSchema, formDataRecord, noteSchema, staffInviteSchema, staffUpdateSchema } from "@/lib/admin-schemas";
import type { AdminActionState } from "@/lib/admin-action-state";
import { requireAdmin } from "@/lib/auth/admin";
import { estimateReadingTime, htmlToPlainText, sanitizeBlogHtml } from "@/lib/blog/content";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function appendAudit(action: string, resourceType: string, resourceId: string | null, metadata: Record<string, string | boolean | null> = {}) {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("admin_audit_log").insert({
    actor_id: admin.user.id,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
  });
  if (error) throw new Error("Could not record the administrative audit event.");
}

function validationFailure(error: ZodError): AdminActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }
  return { status: "error", message: "Revisa los campos indicados.", fieldErrors };
}

function operationFailure(message: string): AdminActionState {
  return { status: "error", message };
}

export async function saveContentPost(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin(["superadmin", "editor"]);
  const result = contentPostSchema.safeParse({ ...formDataRecord(formData), categoryIds: formData.getAll("categoryIds") });
  if (!result.success) return validationFailure(result.error);
  const parsed = result.data;
  const supabase = await createServerSupabaseClient();
  const current = parsed.id
    ? (await supabase.from("content_posts").select("id, kind, slug, origin, published_at").eq("id", parsed.id).maybeSingle())
    : { data: null, error: null };
  if (current.error || (parsed.id && !current.data)) return operationFailure("La publicación ya no existe o no se pudo cargar.");
  const isSynchronized = current.data?.origin === "castelao_es";
  const sanitizedHtml = sanitizeBlogHtml(parsed.contentHtml);
  const contentText = htmlToPlainText(sanitizedHtml);
  if (!contentText) return operationFailure("El contenido debe incluir texto editorial válido.");

  if (!isSynchronized) {
    const uniqueCategoryIds = [...new Set(parsed.categoryIds)];
    if (uniqueCategoryIds.length) {
      const { count, error } = await supabase.from("blog_categories").select("id", { count: "exact", head: true }).in("id", uniqueCategoryIds);
      if (error || count !== uniqueCategoryIds.length) return operationFailure("Una o más categorías seleccionadas ya no están disponibles.");
    }
  }

  if (parsed.id) {
    const payload = isSynchronized
      ? { status: parsed.status, seo_title: parsed.seoTitle, seo_description: parsed.seoDescription }
      : {
        kind: parsed.kind, slug: parsed.slug, title: parsed.title, summary: parsed.summary,
        body: contentText.slice(0, 50_000), content_html: sanitizedHtml, content_text: contentText,
        cover_image_path: parsed.coverImagePath, cover_alt: parsed.coverAlt,
        author_name: parsed.authorName, reading_time_minutes: estimateReadingTime(contentText),
        status: parsed.status,
        published_at: parsed.publishedAt ?? (parsed.status === "published" ? current.data?.published_at ?? new Date().toISOString() : null),
        seo_title: parsed.seoTitle, seo_description: parsed.seoDescription,
      };
    const { error } = await supabase.from("content_posts").update(payload).eq("id", parsed.id);
    if (error) return operationFailure("No fue posible actualizar el contenido. Vuelve a intentarlo.");
    if (!isSynchronized) {
      const { error: deleteError } = await supabase.from("blog_post_categories").delete().eq("post_id", parsed.id);
      if (deleteError) return operationFailure("El contenido se guardó, pero no fue posible actualizar sus categorías.");
      if (parsed.categoryIds.length) {
        const { error: categoryError } = await supabase.from("blog_post_categories").insert([...new Set(parsed.categoryIds)].map((categoryId) => ({ post_id: parsed.id!, category_id: categoryId })));
        if (categoryError) return operationFailure("El contenido se guardó, pero no fue posible asociar sus categorías.");
      }
    }
    await appendAudit("content.updated", "content_post", parsed.id, { status: parsed.status, origin: current.data!.origin });
  } else {
    const publishedAt = parsed.publishedAt ?? (parsed.status === "published" ? new Date().toISOString() : null);
    const { data, error } = await supabase.from("content_posts").insert({
      kind: parsed.kind, slug: parsed.slug, title: parsed.title, summary: parsed.summary,
      body: contentText.slice(0, 50_000), content_html: sanitizedHtml, content_text: contentText,
      cover_image_path: parsed.coverImagePath, cover_alt: parsed.coverAlt,
      author_id: admin.user.id, author_name: parsed.authorName,
      reading_time_minutes: estimateReadingTime(contentText), origin: "castelao_cl",
      status: parsed.status, published_at: publishedAt,
      seo_title: parsed.seoTitle, seo_description: parsed.seoDescription,
    }).select("id").single();
    if (error || !data) return operationFailure("No fue posible crear el contenido. Revisa que el slug no esté en uso.");
    if (parsed.categoryIds.length) {
      const { error: categoryError } = await supabase.from("blog_post_categories").insert([...new Set(parsed.categoryIds)].map((categoryId) => ({ post_id: data.id, category_id: categoryId })));
      if (categoryError) return operationFailure("La publicación fue creada, pero no fue posible asociar sus categorías.");
    }
    await appendAudit("content.created", "content_post", data.id, { status: parsed.status, origin: "castelao_cl" });
  }

  const effectiveKind = current.data?.kind ?? parsed.kind;
  const effectiveSlug = isSynchronized ? current.data!.slug : parsed.slug;
  revalidatePath(`/${effectiveKind === "news" ? "noticias" : "blog"}`);
  if (parsed.status === "published") revalidatePath(`/${effectiveKind === "news" ? "noticias" : "blog"}/${effectiveSlug}`);
  if (current.data && current.data.slug !== effectiveSlug) revalidatePath(`/${current.data.kind === "news" ? "noticias" : "blog"}/${current.data.slug}`);
  redirect("/admin/contenidos?success=saved");
}

export async function deleteContentPost(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin(["superadmin"]);
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return operationFailure("La entrada no tiene un identificador válido.");
  const supabase = await createServerSupabaseClient();
  const { data: post, error: lookupError } = await supabase.from("content_posts").select("origin").eq("id", id).maybeSingle();
  if (lookupError || !post) return operationFailure("La entrada ya no existe.");
  if (post.origin === "castelao_es") return operationFailure("Las publicaciones sincronizadas se archivan; no se eliminan porque volverían a aparecer en la próxima sincronización.");
  const { error } = await supabase.from("content_posts").delete().eq("id", id);
  if (error) return operationFailure("No fue posible eliminar la entrada. Vuelve a intentarlo.");
  await appendAudit("content.deleted", "content_post", id);
  revalidatePath("/blog");
  revalidatePath("/noticias");
  redirect("/admin/contenidos?success=deleted");
}

export async function updateConsultationStatus(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin(["superadmin", "editor"]);
  const id = String(formData.get("id") ?? "");
  const statusResult = consultationStatusSchema.safeParse(formData.get("status"));
  if (!statusResult.success) return validationFailure(statusResult.error);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return operationFailure("La consulta no tiene un identificador válido.");
  const status = statusResult.data;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("contact_submissions").update({ status }).eq("id", id);
  if (error) return operationFailure("No fue posible actualizar el estado de la consulta.");
  await appendAudit("consultation.status_changed", "contact_submission", id, { status });
  revalidatePath(`/admin/consultas/${id}`);
  revalidatePath("/admin/consultas");
  redirect(`/admin/consultas/${id}?success=status`);
}

export async function addConsultationNote(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin(["superadmin", "editor"]);
  const id = String(formData.get("id") ?? "");
  const bodyResult = noteSchema.safeParse(formData.get("body"));
  if (!bodyResult.success) return validationFailure(bodyResult.error);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return operationFailure("La consulta no tiene un identificador válido.");
  const body = bodyResult.data;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("contact_notes").insert({ submission_id: id, author_id: admin.user.id, body });
  if (error) return operationFailure("No fue posible guardar la nota interna.");
  await appendAudit("consultation.note_added", "contact_submission", id);
  revalidatePath(`/admin/consultas/${id}`);
  redirect(`/admin/consultas/${id}?success=note`);
}

export async function inviteStaffMember(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin(["superadmin"]);
  const result = staffInviteSchema.safeParse(formDataRecord(formData));
  if (!result.success) return validationFailure(result.error);
  const { email, role } = result.data;
  const supabase = createAdminSupabaseClient();
  const redirectTo = new URL("/admin/login", siteConfig.url).toString();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error || !data.user) return operationFailure("No fue posible enviar la invitación. Verifica el correo o inténtalo más tarde.");
  const { error: roleError } = await supabase.from("admin_users").insert({ user_id: data.user.id, role, is_active: true });
  if (roleError) {
    await supabase.auth.admin.deleteUser(data.user.id, true);
    return operationFailure("La invitación no pudo recibir acceso administrativo. No se conservó la cuenta.");
  }
  await appendAudit("staff.invited", "admin_user", data.user.id, { role });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?success=invite");
}

export async function updateStaffMember(_previousState: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin(["superadmin"]);
  const result = staffUpdateSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    active: formData.has("active"),
  });
  if (!result.success) return validationFailure(result.error);
  const parsed = result.data;
  if (parsed.userId === admin.user.id && (!parsed.active || parsed.role !== "superadmin")) {
    return operationFailure("No puedes revocar ni cambiar el rol de tu propia cuenta de superadministración.");
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("admin_users").update({ role: parsed.role, is_active: parsed.active }).eq("user_id", parsed.userId);
  if (error) return operationFailure("No fue posible actualizar el acceso de esta persona.");
  await appendAudit(parsed.active ? "staff.updated" : "staff.revoked", "admin_user", parsed.userId, { role: parsed.role, active: parsed.active });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?success=updated");
}
