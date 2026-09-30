import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNotice, PageHeader } from "@/components/admin/admin-ui";
import { ProfessionalEditor } from "@/components/admin/cms-editor";
import { getProfessional } from "@/lib/cms/repository";
import { requireAdmin } from "@/lib/auth/admin";
export default async function EditProfessional({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string }> }) { const admin = await requireAdmin(["superadmin", "editor"]); const { id } = await params; const person = await getProfessional(id, true, true); if (!person) notFound(); const { success } = await searchParams; return <><PageHeader actions={<Link className="admin-button admin-button-secondary" href={`/admin/equipo/${id}/vista-previa`}>Vista previa guardada</Link>} description={`/equipo/${person.slug}`} eyebrow="Equipo" title={person.full_name} />{success === "saved" && <AdminNotice>Perfil guardado correctamente.</AdminNotice>}<ProfessionalEditor key={person.updated_at} person={person} userId={admin.user.id} /></>; }
