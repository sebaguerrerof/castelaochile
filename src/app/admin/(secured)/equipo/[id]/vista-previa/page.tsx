import { notFound, redirect } from "next/navigation";
import { getProfessional } from "@/lib/cms/repository";
export const metadata = { title: "Vista previa privada", robots: { index: false, follow: false } };
export default async function Preview({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (!await getProfessional(id, true, true)) notFound(); redirect(`/admin/vista-previa/equipo/${id}`); }
