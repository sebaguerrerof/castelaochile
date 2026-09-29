"use client";

import { useState } from "react";

import { deleteContentPost, saveContentPost } from "@/app/admin/(secured)/actions";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type EditablePost = Database["public"]["Tables"]["content_posts"]["Row"];

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function ContentEditor({ post, userId, canDelete }: { post: EditablePost | null; userId: string; canDelete: boolean }) {
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [imagePath, setImagePath] = useState(post?.cover_image_path ?? "");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024) {
      setUploadMessage("Usa JPG, PNG o WebP de hasta 5 MB.");
      return;
    }
    setUploading(true);
    setUploadMessage(null);
    const extension = file.name.split(".").pop()?.toLowerCase() || "image";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await createBrowserSupabaseClient().storage.from("content-images").upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) setUploadMessage("No fue posible subir la imagen. Confirma tu sesión y permisos.");
    else {
      setImagePath(path);
      setUploadMessage("Imagen privada cargada. Se hará pública solo al publicar la entrada.");
    }
    setUploading(false);
  }

  return (
    <>
      <AdminActionForm action={saveContentPost} className="admin-form">
        <input name="id" type="hidden" value={post?.id ?? ""} />
        <div className="admin-form-grid"><label htmlFor="content-kind">Tipo<select defaultValue={post?.kind ?? "blog"} id="content-kind" name="kind"><option value="blog">Blog</option><option value="news">Noticia</option></select></label>
        <label htmlFor="content-status">Estado<select defaultValue={post?.status ?? "draft"} id="content-status" name="status"><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label></div>
        <label htmlFor="content-title">Título<input defaultValue={post?.title ?? ""} id="content-title" maxLength={160} name="title" onChange={(event) => { if (!post) setSlug(slugify(event.currentTarget.value)); }} required /></label>
        <label htmlFor="content-slug">Slug<input id="content-slug" maxLength={160} name="slug" onChange={(event) => setSlug(slugify(event.currentTarget.value))} pattern="[a-z0-9]+(-[a-z0-9]+)*" required value={slug} /></label>
        <label htmlFor="content-summary">Resumen<input defaultValue={post?.summary ?? ""} id="content-summary" maxLength={320} minLength={10} name="summary" required /></label>
        <label htmlFor="content-body">Contenido (Markdown seguro, sin HTML)<textarea defaultValue={post?.body ?? ""} id="content-body" maxLength={50_000} name="body" required /></label>
        <label htmlFor="content-cover">Portada privada<input accept="image/jpeg,image/png,image/webp" disabled={uploading} id="content-cover" onChange={uploadCover} type="file" /></label>
        <input name="coverImagePath" type="hidden" value={imagePath} />
        {imagePath && <p>Archivo preparado: <code>{imagePath}</code></p>}
        {uploadMessage && <p role="status">{uploadMessage}</p>}
        <label htmlFor="content-cover-alt">Texto alternativo de la portada<input defaultValue={post?.cover_alt ?? ""} id="content-cover-alt" maxLength={160} name="coverAlt" /></label>
        <div className="admin-form-actions"><AdminSubmitButton pendingLabel="Guardando contenido…">{post ? "Guardar cambios" : "Crear contenido"}</AdminSubmitButton></div>
      </AdminActionForm>
      {post && canDelete && (
        <AdminActionForm action={deleteContentPost} className="admin-form" confirmMessage="Esta eliminación no se puede deshacer. ¿Continuar?">
          <input name="id" type="hidden" value={post.id} />
          <AdminSubmitButton pendingLabel="Eliminando…" variant="danger">Eliminar entrada</AdminSubmitButton>
        </AdminActionForm>
      )}
    </>
  );
}
