"use client";

import { useState } from "react";

import { deleteContentPost, saveContentPost } from "@/app/admin/(secured)/actions";
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
      <form action={saveContentPost} className="admin-form">
        <input name="id" type="hidden" value={post?.id ?? ""} />
        <label>Tipo<select defaultValue={post?.kind ?? "blog"} name="kind"><option value="blog">Blog</option><option value="news">Noticia</option></select></label>
        <label>Título<input defaultValue={post?.title ?? ""} maxLength={160} name="title" onChange={(event) => { if (!post) setSlug(slugify(event.currentTarget.value)); }} required /></label>
        <label>Slug<input maxLength={160} name="slug" onChange={(event) => setSlug(slugify(event.currentTarget.value))} pattern="[a-z0-9]+(-[a-z0-9]+)*" required value={slug} /></label>
        <label>Resumen<input defaultValue={post?.summary ?? ""} maxLength={320} minLength={10} name="summary" required /></label>
        <label>Contenido (Markdown seguro, sin HTML)<textarea defaultValue={post?.body ?? ""} maxLength={50_000} name="body" required /></label>
        <label>Portada privada<input accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadCover} type="file" /></label>
        <input name="coverImagePath" type="hidden" value={imagePath} />
        {imagePath && <p>Archivo preparado: <code>{imagePath}</code></p>}
        {uploadMessage && <p role="status">{uploadMessage}</p>}
        <label>Texto alternativo de la portada<input defaultValue={post?.cover_alt ?? ""} maxLength={160} name="coverAlt" /></label>
        <label>Estado<select defaultValue={post?.status ?? "draft"} name="status"><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>
        <button type="submit">{post ? "Guardar cambios" : "Crear contenido"}</button>
      </form>
      {post && canDelete && (
        <form action={deleteContentPost} className="admin-form" onSubmit={(event) => { if (!window.confirm("Esta eliminación no se puede deshacer. ¿Continuar?")) event.preventDefault(); }}>
          <input name="id" type="hidden" value={post.id} />
          <button type="submit">Eliminar entrada</button>
        </form>
      )}
    </>
  );
}
