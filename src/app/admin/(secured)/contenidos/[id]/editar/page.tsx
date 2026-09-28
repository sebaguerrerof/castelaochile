import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentEditor } from "@/components/admin/content-editor";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminPost } from "@/lib/repositories/admin-repository";

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(["superadmin", "editor"]);
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  return <>
    <header className="admin-page-header">
      <div>
        <p className="eyebrow">CMS</p>
        <h1>Editar entrada</h1>
        <p>Un borrador no se expone mediante una URL pública ni se añade al sitemap.</p>
        <Link className="admin-button-secondary" href={`/admin/contenidos/${post.id}/vista-previa`}>Abrir vista previa privada</Link>
      </div>
    </header>
    <ContentEditor canDelete={admin.role === "superadmin"} post={post} userId={admin.user.id} />
  </>;
}
