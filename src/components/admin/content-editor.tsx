"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { deleteContentPost, saveContentPost } from "@/app/admin/(secured)/actions";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { uploadContentImage } from "@/lib/content-image-upload";
import { formatChileDate } from "@/lib/format-chile-date";
import type { Database } from "@/types/database";

type EditablePost = Database["public"]["Tables"]["content_posts"]["Row"] & { categoryIds: string[] };
type EditableCategory = Pick<Database["public"]["Tables"]["blog_categories"]["Row"], "id" | "name" | "slug" | "source_category_id">;

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function ContentEditor({ post, userId, canDelete, categories }: { post: EditablePost | null; userId: string; canDelete: boolean; categories: EditableCategory[] }) {
  const synchronized = post?.origin === "castelao_es";
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugWasEdited, setSlugWasEdited] = useState(Boolean(post));
  const [imagePath, setImagePath] = useState(post?.cover_image_path ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publicationLocal, setPublicationLocal] = useState(localDateTime(post?.published_at ?? null));
  const [publicationIso, setPublicationIso] = useState(post?.published_at ?? "");
  const initialHtml = post?.content_html ?? (post?.body ? `<p>${escapeHtml(post.body).replaceAll("\n", "<br>")}</p>` : "<p></p>");

  useEffect(() => {
    if (!imagePath) return;
    let active = true;
    createBrowserSupabaseClient().storage.from("content-images").createSignedUrl(imagePath, 600).then(({ data }) => {
      if (active) setImagePreview(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [imagePath]);

  async function uploadCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024) {
      setUploadMessage("Usa JPG, PNG o WebP de hasta 5 MB.");
      return;
    }
    setUploading(true);
    setUploadMessage(null);
    const client = createBrowserSupabaseClient();
    try {
      const path = await uploadContentImage(file, userId);
      const { data } = await client.storage.from("content-images").createSignedUrl(path, 600);
      setImagePath(path);
      setImagePreview(data?.signedUrl ?? null);
      setUploadMessage("Imagen cargada y preparada para la publicación.");
    } catch (error) { setUploadMessage(error instanceof Error ? error.message : "No fue posible subir la imagen."); }
    setUploading(false);
  }

  return <>
    <AdminActionForm action={saveContentPost} className="admin-form admin-content-editor" warnOnUnsavedChanges>
      <input name="id" type="hidden" value={post?.id ?? ""} />
      <div className="admin-content-editor__main">
        {synchronized && <div className="admin-source-notice"><strong>Origen: Castelao España</strong><p>El contenido editorial está sincronizado y es de solo lectura. Puedes cambiar el estado y los campos SEO sin que una futura sincronización los sobrescriba.</p>{post?.source_url && <a href={post.source_url} rel="noopener noreferrer" target="_blank">Ver publicación original</a>}</div>}
        <fieldset className="admin-fieldset"><legend>Contenido</legend>
          <div className="admin-form-grid"><label htmlFor="content-kind">Tipo<select defaultValue={post?.kind ?? "blog"} disabled={synchronized} id="content-kind" name="kind"><option value="blog">Blog</option><option value="news">Noticia</option></select>{synchronized && <input name="kind" type="hidden" value={post.kind} />}</label>
          <label htmlFor="content-author">Autor<input defaultValue={post?.author_name ?? "Equipo Castelao Chile"} id="content-author" maxLength={160} minLength={2} name="authorName" readOnly={synchronized} required /></label></div>
          <label htmlFor="content-title">Título<input defaultValue={post?.title ?? ""} id="content-title" maxLength={160} name="title" onChange={(event) => { if (!slugWasEdited) setSlug(slugify(event.currentTarget.value)); }} readOnly={synchronized} required /></label>
          <label htmlFor="content-slug">Slug<input id="content-slug" maxLength={160} name="slug" onChange={(event) => { setSlugWasEdited(true); setSlug(slugify(event.currentTarget.value)); }} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={synchronized} required value={slug} /></label>
          <label htmlFor="content-summary">Extracto / bajada<textarea defaultValue={post?.summary ?? ""} id="content-summary" maxLength={320} minLength={10} name="summary" readOnly={synchronized} required rows={4} /></label>
          <div className="admin-form-control"><span>Contenido editorial</span><RichTextEditor initialHtml={initialHtml} name="contentHtml" readOnly={synchronized} userId={userId} /></div>
        </fieldset>

        <fieldset className="admin-fieldset"><legend>Taxonomía</legend>
          <div className="admin-category-options">{categories.map((category) => <label key={category.id}><input defaultChecked={post?.categoryIds.includes(category.id)} disabled={synchronized} name="categoryIds" type="checkbox" value={category.id} /><span>{category.name}</span></label>)}</div>
          {synchronized && post.categoryIds.map((id) => <input key={id} name="categoryIds" type="hidden" value={id} />)}
          {!categories.length && <p className="admin-form-help">No hay categorías disponibles. Ejecuta la sincronización o crea la taxonomía antes de publicar.</p>}
        </fieldset>

        <fieldset className="admin-fieldset"><legend>Imagen destacada</legend>
          {imagePreview && <div className="admin-cover-preview"><Image alt={post?.cover_alt || "Vista previa de imagen destacada"} height={360} src={imagePreview} unoptimized width={640} /></div>}
          {!synchronized && <div className="admin-form-grid"><label htmlFor="content-cover">Cargar o reemplazar<input accept="image/jpeg,image/png,image/webp" disabled={uploading} id="content-cover" onChange={uploadCover} type="file" /></label>{imagePath && <button className="admin-button admin-button-secondary" onClick={() => { setImagePath(""); setImagePreview(null); setUploadMessage("La imagen se eliminará al guardar."); }} type="button">Eliminar imagen</button>}</div>}
          <input name="coverImagePath" type="hidden" value={imagePath} />
          {uploadMessage && <p className="admin-form-help" role="status">{uploadMessage}</p>}
          <label htmlFor="content-cover-alt">Texto alternativo<input defaultValue={post?.cover_alt ?? ""} id="content-cover-alt" maxLength={160} name="coverAlt" readOnly={synchronized} /></label>
        </fieldset>

        <fieldset className="admin-fieldset"><legend>SEO</legend>
          <label htmlFor="content-seo-title">SEO title<input defaultValue={post?.seo_title ?? ""} id="content-seo-title" maxLength={70} name="seoTitle" placeholder={post?.title ?? "Se usará el título editorial"} /></label>
          <label htmlFor="content-seo-description">Meta description<textarea defaultValue={post?.seo_description ?? ""} id="content-seo-description" maxLength={170} minLength={10} name="seoDescription" placeholder={post?.summary ?? "Se usará el extracto editorial"} rows={3} /></label>
        </fieldset>
      </div>

      <aside className="admin-content-editor__sidebar">
        <fieldset className="admin-fieldset"><legend>Publicación</legend>
          <label htmlFor="content-status">Estado<select defaultValue={post?.status ?? "draft"} id="content-status" name="status"><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>
          <label htmlFor="content-published-at">Fecha de publicación<input id="content-published-at" onChange={(event) => { const value = event.currentTarget.value; setPublicationLocal(value); setPublicationIso(value ? new Date(value).toISOString() : ""); }} readOnly={synchronized} type="datetime-local" value={publicationLocal} /></label>
          <input name="publishedAt" type="hidden" value={post?.origin === "castelao_es" ? post.published_at ?? "" : publicationIso} />
          <p className="admin-form-help">Una publicación con fecha futura se mantendrá oculta hasta ese momento.</p>
          <div className="admin-form-actions"><AdminSubmitButton pendingLabel="Guardando contenido…">{post ? "Guardar cambios" : "Crear contenido"}</AdminSubmitButton></div>
        </fieldset>
        {post && <fieldset className="admin-fieldset admin-system-info"><legend>Información de sistema</legend>
          <dl><div><dt>Origen</dt><dd>{synchronized ? "Castelao España" : "Castelao Chile"}</dd></div><div><dt>Tiempo de lectura</dt><dd>{post.reading_time_minutes ? `${post.reading_time_minutes} min` : "Se calculará al guardar"}</dd></div><div><dt>Última sincronización</dt><dd>{post.synced_at ? formatChileDate(post.synced_at, true) : "No aplica"}</dd></div><div><dt>Creado</dt><dd>{formatChileDate(post.created_at)}</dd></div><div><dt>Actualizado</dt><dd>{formatChileDate(post.updated_at)}</dd></div></dl>
        </fieldset>}
      </aside>
    </AdminActionForm>
    {post && canDelete && !synchronized && <AdminActionForm action={deleteContentPost} className="admin-form" confirmMessage="Esta eliminación no se puede deshacer. ¿Continuar?"><input name="id" type="hidden" value={post.id} /><AdminSubmitButton pendingLabel="Eliminando…" variant="danger">Eliminar entrada</AdminSubmitButton></AdminActionForm>}
  </>;
}
