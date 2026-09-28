import { ContentEditor } from "@/components/admin/content-editor";
import { requireAdmin } from "@/lib/auth/admin";

export default async function NewContentPage() {
  const admin = await requireAdmin(["superadmin", "editor"]);
  return <><header className="admin-page-header"><div><p className="eyebrow">CMS</p><h1>Nueva entrada</h1><p>El editor acepta Markdown limitado; HTML, scripts e iframes están bloqueados.</p></div></header><ContentEditor canDelete={false} post={null} userId={admin.user.id} /></>;
}
