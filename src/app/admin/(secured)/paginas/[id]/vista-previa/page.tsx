import { notFound, redirect } from "next/navigation";
import { getEditablePage } from "@/lib/cms/repository";
export const metadata = { title: "Vista previa privada", robots: { index: false, follow: false } };
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params; if (!await getEditablePage(id)) notFound(); redirect(`/admin/vista-previa/paginas/${id}`);
}
