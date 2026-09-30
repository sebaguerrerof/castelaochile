import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { SafeHtml } from "@/components/content/safe-html";
import { SafeMarkdown } from "@/components/content/safe-markdown";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminPost, listAdminCategories } from "@/lib/repositories/admin-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };
export const dynamic = "force-dynamic";

export default async function ContentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(["superadmin", "editor"]);
  const { id } = await params;
  const [post, categories] = await Promise.all([getAdminPost(id), listAdminCategories()]);
  if (!post) notFound();

  let coverUrl: string | null = null;
  if (post.cover_image_path) {
    const { data } = await createAdminSupabaseClient().storage.from("content-images").createSignedUrl(post.cover_image_path, 60);
    coverUrl = data?.signedUrl ?? null;
  }

  return <article className="admin-preview">
    <header className="admin-page-header">
      <div>
        <p className="eyebrow">Vista previa privada · {post.kind === "news" ? "Noticia" : "Blog"} · {post.origin === "castelao_es" ? "Castelao España" : "Castelao Chile"}</p>
        <h1>{post.title}</h1>
        <p>{post.summary}</p>
        <p><strong>Estado:</strong> {post.status === "draft" ? "Borrador" : post.status === "published" ? "Publicado" : "Archivado"} · <strong>Autor:</strong> {post.author_name || "Sin autor"} · <strong>Categorías:</strong> {categories.filter((category) => post.categoryIds.includes(category.id)).map((category) => category.name).join(", ") || "Sin categoría"}</p>
      </div>
    </header>
    {coverUrl && <Image alt={post.cover_alt || post.title} className="admin-preview-cover" height={720} src={coverUrl} width={1280} />}
    {post.content_html ? <SafeHtml value={post.content_html} /> : <SafeMarkdown value={post.body} />}
    {post.source_url && <p className="admin-form-help"><a href={post.source_url} rel="noopener noreferrer" target="_blank">Ver publicación original</a></p>}
  </article>;
}
