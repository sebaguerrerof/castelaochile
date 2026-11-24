import Link from "next/link";
import { AdminPanel, PageHeader } from "@/components/admin/admin-ui";
import { CareField, CareForm } from "@/components/care/care-form";
import { AttendanceForm, CommitmentForm, EventForm } from "@/components/care/planning-forms";
import { careEvent } from "@/lib/care/planning-server";
import { getCareCapabilities } from "@/lib/care/server";
import { careTimestamp } from "@/lib/care/time";
import { attendanceLabels, eventKindLabels, eventStatusLabels } from "@/lib/care/planning";
import { staffPlanningAction } from "../../planning-actions";
export default async function CareEventPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const {event,participants,history,roster,client}=await careEvent(id);const caps=await getCareCapabilities();const write=caps.includes("care.records.create");
  const {data:{user}}=await client.auth.getUser();
  const recoveryIds=new Set<string>();let recoveryRecords:{id:string;patient_id:string;status:"draft"|"final"}[]=[];
  if(user&&caps.includes("care.records.create")&&event.status==="completed"&&event.professional_id===user.id&&["recovery","sport","group"].includes(event.kind)&&participants.length){
    const instant=new Date().toISOString();
    const [assignments,records]=await Promise.all([client.from("care_assignments").select("patient_id").eq("professional_id",user.id).eq("specialty","recovery").in("patient_id",participants.map(p=>p.patient_id)).lte("starts_at",instant).or(`ends_at.is.null,ends_at.gt.${instant}`),client.from("care_session_records").select("id,patient_id,status").eq("event_id",id).eq("author_id",user.id).eq("specialty","recovery")]);
    if(assignments.error||records.error)throw new Error("No fue posible verificar los registros individuales de Recovery.");assignments.data.forEach(a=>recoveryIds.add(a.patient_id));recoveryRecords=records.data;
  }
  const attendanceHistory=await client.from("care_attendance_history").select("*").eq("event_id",id).order("version",{ascending:false});
  if(attendanceHistory.error)throw new Error("No fue posible cargar las correcciones de asistencia.");
  return <><PageHeader title={event.title} eyebrow={eventKindLabels[event.kind]} description={`${careTimestamp(event.starts_at)} a ${careTimestamp(event.ends_at)} · ${eventStatusLabels[event.status]} · ${event.modality==="remote"?"Remota":"Presencial"}`} actions={<Link href="/admin/seguimiento" prefetch={false} className="admin-button admin-button-secondary">Volver a pacientes</Link>}/>
    {event.location&&<p>{event.location}</p>}
    {event.status==="scheduled"&&write&&roster.can_edit&&<div className="care-grid"><AdminPanel title="Cerrar actividad" description="Marcar realizada requiere que haya terminado. La asistencia se registra después, sin asumir ausencias."><CareForm action={staffPlanningAction} label="Cerrar actividad"><input name="op" type="hidden" value="event_close"/><input name="id" type="hidden" value={id}/><input name="version" type="hidden" value={event.version}/><CareField name="status" label="Resultado de la actividad"><select required defaultValue=""><option value="" disabled>Selecciona el resultado</option><option value="completed">Realizada</option><option value="cancelled">Cancelada</option></select></CareField><CareField name="reason" label="Motivo compartido del cierre"><input required minLength={3} maxLength={300}/></CareField></CareForm></AdminPanel>
    <AdminPanel title="Reprogramar esta instancia"><EventForm action={staffPlanningAction} event={event} patients={roster.patients} participantIds={participants.map(p=>p.patient_id)}/></AdminPanel></div>}
    {!roster.can_edit&&event.status==="scheduled"&&<p className="care-subtle">El cierre o la reprogramación requiere alcance vigente sobre todos los participantes. Puedes registrar después la asistencia de tus pacientes asignados.</p>}
    <AdminPanel title="Participantes de tu alcance" description="Solo se muestran pacientes autorizados. Puntualidad y participación permanecen sin evaluación si no se observaron."><div className="care-cards">{participants.map(p=><article className="care-card" key={p.patient_id}><div><h2>{roster.patients.find(n=>n.id===p.patient_id)?.display_name??"Paciente autorizado"}</h2><p>{attendanceLabels[p.attendance]}</p><Link href={`/admin/seguimiento/pacientes/${p.patient_id}/planificacion`} prefetch={false}>Abrir planificación del paciente</Link>
      {recoveryIds.has(p.patient_id)&&(()=>{const r=recoveryRecords.find(r=>r.patient_id===p.patient_id);return <div><p>{r?.status==="final"?"Registro Recovery finalizado":r?"Borrador Recovery privado":"Registro Recovery pendiente"}</p><Link href={r?`/admin/seguimiento/pacientes/${p.patient_id}/registros/${r.id}`:`/admin/seguimiento/pacientes/${p.patient_id}/registros/nuevo?actividad=${id}&tipo=recovery`} prefetch={false}>{r?.status==="final"?"Abrir registro Recovery":r?"Continuar borrador Recovery":"Registrar actividad Recovery"}</Link></div>;})()}
      {write&&event.status==="completed"&&<details><summary>Registrar o corregir asistencia</summary><AttendanceForm action={staffPlanningAction} participant={p}/></details>}
      {write&&<details><summary>Acordar un compromiso</summary><CommitmentForm action={staffPlanningAction} pid={p.patient_id} eventId={id}/></details>}
      {attendanceHistory.data.filter(h=>h.patient_id===p.patient_id).length>0&&<details><summary>Historial de asistencia</summary><ol className="care-history">{attendanceHistory.data.filter(h=>h.patient_id===p.patient_id).map(h=><li key={h.id}><p>{attendanceLabels[h.attendance as keyof typeof attendanceLabels]} · {h.reason}</p><p className="care-subtle">{careTimestamp(h.recorded_at)} · versión {h.version}</p></li>)}</ol></details>}
    </div></article>)}</div></AdminPanel>
    <AdminPanel title="Historia de la actividad"><ol className="care-history">{history.map(h=><li key={h.id}><p>{h.title} · {careTimestamp(h.starts_at)}</p><p>{h.reason} · versión {h.version} · registrado {careTimestamp(h.recorded_at)}</p></li>)}</ol></AdminPanel>
  </>;
}
