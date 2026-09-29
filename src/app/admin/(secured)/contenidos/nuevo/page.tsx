import { ContentEditor } from "@/components/admin/content-editor";
import { AdminPanel, PageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";

export default async function NewContentPage() {
  const admin = await requireAdmin(["superadmin", "editor"]);
  return <><PageHeader description="El editor acepta Markdown limitado; HTML, scripts e iframes están bloqueados." eyebrow="CMS" title="Nueva entrada" /><AdminPanel><ContentEditor canDelete={false} post={null} userId={admin.user.id} /></AdminPanel></>;
}
