import { forbidden,notFound,redirect } from "next/navigation";
import { z } from "zod";
import { AdminPanel,PageHeader } from "@/components/admin/admin-ui";
import { PatientFileNav } from "@/components/care/patient-file-nav";
import { ProfessionalRecordForm } from "@/components/care/record-form";
import { recordPatient } from "@/lib/care/record-server";
import { specialtyLabels } from "@/lib/care/policy";
import { attendanceLabels } from "@/lib/care/planning";
import { requireAdmin } from "@/lib/auth/admin";
export default async function NewRecordPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{actividad?:string;tipo?:string}>}){
 const {id}=await params;const {actividad,tipo}=await searchParams;const parsed=z.object({actividad:z.uuid(),tipo:z.enum(["psychology","recovery","psychiatry"])}).safeParse({actividad,tipo});if(!parsed.success)notFound();const {client,patient,caps}=await recordPatient(id);if(!caps.includes("care.records.create"))forbidden();const {data:{user}}=await client.auth.getUser();const eid=parsed.data.actividad,kind=parsed.data.tipo;
 const [event,participant,assignment,existing]=await Promise.all([client.from("care_events").select("*").eq("id",eid).eq("professional_id",user!.id).neq("status","cancelled").maybeSingle(),client.from("care_event_participants").select("*").eq("event_id",eid).eq("patient_id",id).maybeSingle(),client.from("care_assignments").select("id").eq("patient_id",id).eq("professional_id",user!.id).eq("specialty",kind).lte("starts_at",new Date().toISOString()).or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).limit(1),client.from("care_session_records").select("id").eq("patient_id",id).eq("event_id",eid).eq("author_id",user!.id).eq("specialty",kind).maybeSingle()]);
 const admin=await requireAdmin();
 if(event.error||!event.data||participant.error||!participant.data||assignment.error||(admin.role!=="superadmin"&&!assignment.data.length)||existing.error)notFound();
 // The action refresh may arrive before client action state. Resolve the stored
 // tuple on the server, including a repeated visit to the same session.
 if(existing.data)redirect(`/admin/seguimiento/pacientes/${id}/registros/${existing.data.id}`);
 return <><PageHeader title={patient.display_name} eyebrow={`Registro de ${specialtyLabels[kind]}`} description={`Sesión: ${event.data.title} · asistencia: ${attendanceLabels[participant.data.attendance]}. La asistencia es un registro independiente.`}/><PatientFileNav followupAllowed={caps.includes("care.records.read")} id={id} active="records" recordsAllowed reportsAllowed={caps.includes("care.records.read")||caps.includes("care.assignments.manage")}/><AdminPanel title="Registrar sesión" description="Sin evolución preseleccionada. Guardar borrador no finaliza ni comparte. Los campos finales son coordinación del equipo autorizado; la nota reservada es visible para su autor y Dirección."><ProfessionalRecordForm pid={id} eid={eid} kind={kind} occurredAt={event.data.starts_at} medical={caps.includes("care.medical.create")}/></AdminPanel></>;
}
