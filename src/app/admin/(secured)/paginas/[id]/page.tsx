import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNotice, PageHeader } from "@/components/admin/admin-ui";
import { CmsEditor } from "@/components/admin/cms-editor";
import { getEditablePage } from "@/lib/cms/repository";
import { requireAdmin } from "@/lib/auth/admin";
export default async function PageEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string }> }) {
 const admin = await requireAdmin(["superadmin", "editor"]); const { id } = await params; const page = await getEditablePage(id); if (!page) notFound(); const { success } = await searchParams;
 return <><PageHeader actions={<Link className="admin-button admin-button-secondary" href={`/admin/paginas/${id}/vista-previa`} target="_blank">Vista previa guardada</Link>} description={page.path} eyebrow="Páginas" title={page.title} />{success === "saved" && <AdminNotice>Cambios guardados correctamente.</AdminNotice>}<CmsEditor key={page.updated_at} page={page} userId={admin.user.id} /></>;
}
