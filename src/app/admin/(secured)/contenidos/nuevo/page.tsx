import { ContentEditor } from "@/components/admin/content-editor";
import { AdminPanel, PageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminCategories } from "@/lib/repositories/admin-repository";

export default async function NewContentPage() {
  const admin = await requireAdmin(["superadmin", "editor"]);
  const categories = await listAdminCategories();
  return <><PageHeader description="Crea contenido local con editor enriquecido, taxonomía, portada, publicación y SEO." eyebrow="CMS" title="Nueva entrada" /><AdminPanel><ContentEditor canDelete={false} categories={categories} post={null} userId={admin.user.id} /></AdminPanel></>;
}
