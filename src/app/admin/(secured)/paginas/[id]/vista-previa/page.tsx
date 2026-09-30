import { notFound } from "next/navigation";
import { CmsPageView } from "@/components/cms/cms-page";
import { getCmsPage, getEditablePage } from "@/lib/cms/repository";
import { AdminNotice } from "@/components/admin/admin-ui";
export const metadata = { title: "Vista previa privada", robots: { index: false, follow: false } };
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params; const editable = await getEditablePage(id); if (!editable) notFound(); const page = await getCmsPage(editable.slug, true); if (!page) notFound();
 return <><AdminNotice tone="info">Vista previa privada del contenido guardado · {page.status}</AdminNotice><CmsPageView page={page} /></>;
}
