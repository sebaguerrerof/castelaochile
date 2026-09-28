"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { contentPostSchema, consultationStatusSchema, formDataRecord, noteSchema, staffInviteSchema, staffUpdateSchema } from "@/lib/admin-schemas";
import { requireAdmin } from "@/lib/auth/admin";
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

export async function saveContentPost(formData: FormData) {
  const admin = await requireAdmin(["superadmin", "editor"]);
  const parsed = contentPostSchema.parse(formDataRecord(formData));
  const supabase = await createServerSupabaseClient();
  const payload = {
    kind: parsed.kind,
    slug: parsed.slug,
    title: parsed.title,
    summary: parsed.summary,
    body: parsed.body,
    cover_image_path: parsed.coverImagePath,
    cover_alt: parsed.coverAlt,
    status: parsed.status,
    published_at: parsed.status === "published" ? new Date().toISOString() : null,
  };

  if (parsed.id) {
    const { error } = await supabase.from("content_posts").update(payload).eq("id", parsed.id);
    if (error) throw new Error("Could not update content.");
    await appendAudit("content.updated", "content_post", parsed.id, { status: parsed.status });
  } else {
    const { data, error } = await supabase.from("content_posts").insert({ ...payload, author_id: admin.user.id }).select("id").single();
    if (error || !data) throw new Error("Could not create content.");
    await appendAudit("content.created", "content_post", data.id, { status: parsed.status });
  }

  revalidatePath(`/${parsed.kind === "news" ? "noticias" : "blog"}`);
  if (parsed.status === "published") revalidatePath(`/${parsed.kind === "news" ? "noticias" : "blog"}/${parsed.slug}`);
  redirect("/admin/contenidos");
}

export async function deleteContentPost(formData: FormData) {
  await requireAdmin(["superadmin"]);
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid content identifier.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("content_posts").delete().eq("id", id);
  if (error) throw new Error("Could not delete content.");
  await appendAudit("content.deleted", "content_post", id);
  revalidatePath("/blog");
  revalidatePath("/noticias");
  redirect("/admin/contenidos");
}

export async function updateConsultationStatus(formData: FormData) {
  await requireAdmin(["superadmin", "editor"]);
  const id = String(formData.get("id") ?? "");
  const status = consultationStatusSchema.parse(formData.get("status"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid consultation identifier.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("contact_submissions").update({ status }).eq("id", id);
  if (error) throw new Error("Could not update the consultation.");
  await appendAudit("consultation.status_changed", "contact_submission", id, { status });
  revalidatePath(`/admin/consultas/${id}`);
  revalidatePath("/admin/consultas");
}

export async function addConsultationNote(formData: FormData) {
  const admin = await requireAdmin(["superadmin", "editor"]);
  const id = String(formData.get("id") ?? "");
  const body = noteSchema.parse(formData.get("body"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid consultation identifier.");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("contact_notes").insert({ submission_id: id, author_id: admin.user.id, body });
  if (error) throw new Error("Could not add the internal note.");
  await appendAudit("consultation.note_added", "contact_submission", id);
  revalidatePath(`/admin/consultas/${id}`);
}

export async function inviteStaffMember(formData: FormData) {
  await requireAdmin(["superadmin"]);
  const { email, role } = staffInviteSchema.parse(formDataRecord(formData));
  const supabase = createAdminSupabaseClient();
  const redirectTo = new URL("/admin/login", siteConfig.url).toString();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error || !data.user) throw new Error("Could not invite the staff member.");
  const { error: roleError } = await supabase.from("admin_users").insert({ user_id: data.user.id, role, is_active: true });
  if (roleError) {
    await supabase.auth.admin.deleteUser(data.user.id, true);
    throw new Error("The invitation could not be authorized. No account was retained.");
  }
  await appendAudit("staff.invited", "admin_user", data.user.id, { role });
  revalidatePath("/admin/usuarios");
}

export async function updateStaffMember(formData: FormData) {
  await requireAdmin(["superadmin"]);
  const parsed = staffUpdateSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    active: formData.has("active"),
  });
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("admin_users").update({ role: parsed.role, is_active: parsed.active }).eq("user_id", parsed.userId);
  if (error) throw new Error("Could not update staff access.");
  await appendAudit(parsed.active ? "staff.updated" : "staff.revoked", "admin_user", parsed.userId, { role: parsed.role, active: parsed.active });
  revalidatePath("/admin/usuarios");
}
