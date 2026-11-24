import { CmsPageCreateForm } from "@/components/admin/cms-page-create-form";
import { PageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";

export default async function NewCmsPage() {
  await requireAdmin(["editor", "superadmin"]);
  return <><PageHeader eyebrow="CMS" title="Nueva página" description="Crea una página editable con ruta propia. Las rutas del portal y de otros módulos están reservadas." /><CmsPageCreateForm /></>;
}
