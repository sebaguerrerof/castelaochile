import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { SafeMarkdown } from "@/components/content/safe-markdown";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminPost } from "@/lib/repositories/admin-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };
export const dynamic = "force-dynamic";

export default async function ContentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(["superadmin", "editor"]);
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  let coverUrl: string | null = null;
  if (post.cover_image_path) {
    const { data } = await createAdminSupabaseClient().storage.from("content-images").createSignedUrl(post.cover_image_path, 60);
    coverUrl = data?.signedUrl ?? null;
  }

  return <article className="admin-preview">
    <header className="admin-page-header">
      <div>
        <p className="eyebrow">Vista previa privada · {post.kind === "news" ? "Noticia" : "Blog"}</p>
        <h1>{post.title}</h1>
        <p>{post.summary}</p>
        <p><strong>Estado:</strong> {post.status === "draft" ? "Borrador" : post.status === "published" ? "Publicado" : "Archivado"}</p>
      </div>
    </header>
    {coverUrl && <Image alt={post.cover_alt || post.title} className="admin-preview-cover" height={720} src={coverUrl} width={1280} />}
    <SafeMarkdown value={post.body} />
  </article>;
}
