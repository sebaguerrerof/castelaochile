import { notFound } from "next/navigation";

import { ContentEditor } from "@/components/admin/content-editor";
import { AdminPanel, PageHeader, SecondaryLink } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminPost } from "@/lib/repositories/admin-repository";

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(["superadmin", "editor"]);
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  return <>
    <PageHeader actions={<SecondaryLink href={`/admin/contenidos/${post.id}/vista-previa`}>Abrir vista previa privada</SecondaryLink>} description="Un borrador no se expone mediante una URL pública ni se añade al sitemap." eyebrow="CMS" title={`Editar: ${post.title}`} />
    <AdminPanel><ContentEditor canDelete={admin.role === "superadmin"} post={post} userId={admin.user.id} /></AdminPanel>
  </>;
}
