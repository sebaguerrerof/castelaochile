import { notFound } from "next/navigation";
import { ProfessionalProfile } from "@/components/cms/professional-profile";
import { getProfessional } from "@/lib/cms/repository";
export const metadata = { title: "Vista previa privada", robots: { index: false, follow: false } };
export default async function Preview({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const person = await getProfessional(id, true, true); if (!person) notFound(); return <ProfessionalProfile person={person} />; }
