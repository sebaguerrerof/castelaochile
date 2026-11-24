import Link from "next/link";
import { AdminPanel, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { EventForm } from "@/components/care/planning-forms";
import { careDirectory, carePatient, requireCare } from "@/lib/care/server";
import { staffPlanningAction } from "../../planning-actions";
export default async function NewCareEvent({searchParams}:{searchParams:Promise<{paciente?:string;q?:string;pagina?:string}>}) {
  await requireCare("care.records.create");const p=await searchParams;
  const directory=await careDirectory();const chosen=p.paciente?(await carePatient(p.paciente)).patient:null;
  const patients=chosen&&!directory.patients.some(r=>r.id===chosen.id)?[chosen,...directory.patients]:directory.patients;
  return <><PageHeader title="Programar actividad" eyebrow="Agenda del equipo" description="Registra una actividad y sus participantes esperados. El responsable es tu cuenta autenticada." actions={<Link href="/admin/seguimiento" prefetch={false} className="admin-button admin-button-secondary">Volver a seguimiento</Link>}/>
    <AdminPanel title="Actividad y participantes" description="Busca pacientes autorizados conservando los seleccionados. Una actividad grupal se guarda una sola vez, vinculada a sus participantes.">
    {patients.length?<EventForm action={staffPlanningAction} patients={patients} total={directory.total} participantIds={chosen?[chosen.id]:[]}/>:<StatePanel title="Sin pacientes disponibles" description="Solicita asignaciones vigentes antes de programar actividades."/>}
    <p className="care-subtle">Las series generan instancias independientes; editar una instancia conserva el historial y no recalcula otras semanas. Para cambiar participantes, cancela esa instancia y programa una nueva.</p></AdminPanel>
  </>;
}
