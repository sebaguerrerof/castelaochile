import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfessional } from "@/lib/cms/repository";
import { ProfessionalProfile } from "@/components/cms/professional-profile";
import { EditorialPreviewFrame, getEditorialPreviewContext } from "@/components/cms/editorial-preview";

export default async function ProfessionalCanvas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getProfessional(id, true, true);
  if (!person) notFound();
  const { links } = await getEditorialPreviewContext();
  return <><div style={{ padding: "12px 24px", background: "#eff6ff", color: "#073a5c", fontSize: 14 }}>Vista previa privada del perfil. <Link href={`/admin/equipo/${id}`}>Volver al editor</Link></div><EditorialPreviewFrame><ProfessionalProfile backHref={links["/equipo"] ?? "/equipo"} person={{ ...person, cta_url: links[person.cta_url] ?? person.cta_url }} /></EditorialPreviewFrame></>;
}
