import { forbidden } from "next/navigation";
import Link from "next/link";
import { AdminFormDialog } from "@/components/admin/admin-form-dialog";
import { AdminNotice, AdminPanel, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { CareField, CareForm } from "@/components/care/care-form";
import { CareNav } from "@/components/care/care-nav";
import { requireAdmin } from "@/lib/auth/admin";
import { careDirectory, careEnabled, careTeam, getCareCapabilities } from "@/lib/care/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { carePage, specialtyLabels } from "@/lib/care/policy";
import { careLocalInput, careTimestamp } from "@/lib/care/time";
import { manageCare } from "../actions";

export default async function CareTeamPage({searchParams}:{searchParams:Promise<{q?:string;pagina?:string}>}) {
  const admin=await requireAdmin();const caps=await getCareCapabilities();const technical=admin.role==="superadmin";const manager=caps.includes("care.assignments.manage");
  if(!careEnabled())return <StatePanel title="Seguimiento no habilitado" description="Habilita el módulo local antes de configurar el equipo." tone="disabled"/>;
  if(!technical&&!manager)forbidden();
  const client=await createServerSupabaseClient();
  const params=await searchParams;const q=(params.q??"").slice(0,100);const page=carePage(params.pagina);
  const [directory,team,assignments]=await Promise.all([
    manager?careDirectory(q,page,true):Promise.resolve(null),manager?careTeam():Promise.resolve([]),
    manager?client.from("care_assignments").select("*").is("ends_at",null).order("starts_at").limit(100):Promise.resolve({data:[],error:null}),
  ]);
  if(assignments.error)throw new Error("No fue posible cargar la configuración de atención.");
  return <><PageHeader title="Equipo y asignaciones" eyebrow="Equipo del centro" description="Elige un paciente y su profesional responsable. El perfil del usuario aplica sus permisos automáticamente."/>
    <CareNav caps={caps} technical={technical} active="team"/>
    <AdminNotice tone="info">Dirección tiene acceso completo al centro. Los perfiles Psicólogo, Psiquiatra y Coach Recovery reciben sus permisos al elegir el rol; asigna aquí los pacientes de cada profesional. <Link prefetch={false} href="/admin/usuarios">Gestionar perfiles del equipo</Link></AdminNotice>
    {manager&&<><AdminPanel title="Asignar un profesional" description="Busca el paciente y selecciona el responsable. Fecha y hora de Chile (America/Santiago).">
      <form method="get" className="admin-form care-search"><label>Buscar paciente para asignar<input name="q" type="search" maxLength={100} defaultValue={q}/></label><button className="admin-button admin-button-secondary">Buscar</button></form>
      {directory?.patients.length&&team.length?<AdminFormDialog title="Asignar un profesional" description="Selecciona paciente, profesional y función. Las fechas usan la hora de Chile." triggerLabel="Nueva asignación"><CareForm action={manageCare} label="Crear asignación"><input type="hidden" name="op" value="assignment"/>
        <CareField name="patient_id" label="Paciente"><select required defaultValue=""><option value="" disabled>Selecciona un paciente</option>{directory.patients.map(p=><option key={p.id} value={p.id}>{p.display_name}{!p.is_active?" · acceso suspendido":""}</option>)}</select></CareField>
        <CareField name="professional_id" label="Profesional"><select required defaultValue=""><option value="" disabled>Selecciona un profesional</option>{team.map(p=><option key={p.user_id} value={p.user_id}>{p.label}</option>)}</select></CareField>
        <CareField name="specialty" label="Función en esta asignación"><select required defaultValue=""><option value="" disabled>Selecciona una función</option>{Object.entries(specialtyLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></CareField>
        <CareField name="starts_at" label="Vigente desde"><input required type="datetime-local" defaultValue={careLocalInput()}/></CareField>
      </CareForm></AdminFormDialog>:<StatePanel title="Falta configuración" description="Crea un paciente e invita a un Psicólogo, Psiquiatra o Coach Recovery desde Equipo y usuarios. Sus accesos se asignan al elegir el rol."/>}
      {directory&&<nav className="care-nav" aria-label="Páginas para asignar">{page>1&&<a href={`?q=${encodeURIComponent(q)}&pagina=${page-1}`}>Anterior</a>}{page*25<directory.total&&<a href={`?q=${encodeURIComponent(q)}&pagina=${page+1}`}>Siguiente</a>}</nav>}
    </AdminPanel>
    <AdminPanel title="Asignaciones abiertas" description="Se muestran hasta 100 asignaciones. La revocación impide nuevas lecturas y conserva el historial."><div className="care-cards">{assignments.data?.map(a=><article key={a.id} className="care-card"><div><h3>{directory?.patients.find(p=>p.id===a.patient_id)?.display_name??"Paciente fuera de esta página"}</h3><p>{team.find(p=>p.user_id===a.professional_id)?.label??"Profesional sin acceso vigente"} · {specialtyLabels[a.specialty]}</p><p className="care-subtle">Desde {careTimestamp(a.starts_at)}</p></div><CareForm action={manageCare} label="Revocar asignación" confirm="¿Revocar esta asignación? Impedirá nuevas lecturas de este profesional en ese alcance."><input type="hidden" name="op" value="assignment_end"/><input type="hidden" name="id" value={a.id}/></CareForm></article>)}</div>{!assignments.data?.length&&<p>No hay asignaciones abiertas.</p>}</AdminPanel>
    <AdminPanel title="Catálogo de fases" dialog="Añadir fase" description="Añade únicamente una fase oficial aprobada por el equipo. No se incorporan fases de ejemplo."><CareForm action={manageCare} label="Añadir fase"><input type="hidden" name="op" value="phase"/><input type="hidden" name="id" value=""/><input type="hidden" name="is_active" value="on"/><CareField name="label" label="Nombre de fase aprobada"><input minLength={2} maxLength={80} required/></CareField></CareForm></AdminPanel></>}
  </>;
}
