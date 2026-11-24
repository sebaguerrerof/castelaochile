import Link from "next/link";
import { notFound } from "next/navigation";
import { getEditablePage, getCmsPage } from "@/lib/cms/repository";
import { EditorialPreview } from "@/components/cms/editorial-preview";

export default async function EditorialCanvas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const editable = await getEditablePage(id);
  if (!editable) notFound();
  const page = await getCmsPage(editable.slug, true);
  if (!page) notFound();
  return <><div style={{ padding: "12px 24px", background: "#eff6ff", color: "#073a5c", fontSize: 14 }}>Vista previa privada · El contenido público conserva su versión. <Link href={`/admin/paginas/${id}`}>Volver al editor</Link></div><EditorialPreview page={page} /></>;
}
