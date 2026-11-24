import Link from "next/link";
import { AdminPanel, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { PatientFileNav } from "@/components/care/patient-file-nav";
import { CommitmentForm, CompleteCommitmentForm } from "@/components/care/planning-forms";
import { WeekSelector } from "@/components/care/week-selector";
import { carePatient, careResponsibles, getCareCapabilities } from "@/lib/care/server";
import { planningData } from "@/lib/care/planning-server";
import { carePage } from "@/lib/care/policy";
import { careTimestamp } from "@/lib/care/time";
import { attendanceLabels, commitmentStatus, eventStatusLabels, planStatusLabels } from "@/lib/care/planning";
import { staffPlanningAction } from "../../../planning-actions";
export default async function CarePlanningPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{semana?:string;pagina?:string}>}) {
  const {id}=await params;const {client,patient}=await carePatient(id);const caps=await getCareCapabilities();const query=await searchParams;const page=carePage(query.pagina);
  const [data,responsibles]=await Promise.all([planningData(client,id,false,query.semana,page),careResponsibles(id)]);const write=caps.includes("care.records.create");
  const choices=Array.from(new Map(responsibles.map(r=>[r.user_id,r])).values());
  const history=data.commitments.length?await client.from("care_commitment_history").select("*").in("commitment_id",data.commitments.map(c=>c.id)).order("version",{ascending:false}):{data:[],error:null};
  if(history.error)throw new Error("No fue posible cargar versiones de compromisos.");
  return <><PageHeader title={patient.display_name} eyebrow="Planificación y compromisos" description="La agenda institucional, los planes referidos por el paciente y los compromisos conservan fuentes distintas."/>
    <PatientFileNav autonomyAllowed={caps.includes("care.records.read")} familyAllowed={caps.includes("care.records.read")&&caps.includes("care.family.read")} followupAllowed={caps.includes("care.records.read")} recordsAllowed={caps.includes("care.records.read")||caps.includes("care.records.create")} id={id} active="planning" reportsAllowed={caps.includes("care.records.read")||caps.includes("care.assignments.manage")}/><WeekSelector range={data.range} total={Math.max(data.total,data.planTotal,data.commitmentTotal)} page={page} base={`/admin/seguimiento/pacientes/${id}/planificacion`}/>
    <AdminPanel title="Agenda institucional" description="La asistencia permanece pendiente hasta su registro; cancelar no genera una ausencia.">{write&&<p><Link href={`/admin/seguimiento/agenda/nuevo?paciente=${id}`} prefetch={false}>Programar una actividad</Link></p>}
      {data.events.length?<div className="care-cards">{data.events.map(e=><article className="care-card" key={e.id}><div><h3>{e.title}</h3><p>{careTimestamp(e.starts_at)} · {eventStatusLabels[e.status]}</p><p>{attendanceLabels[data.participants.find(p=>p.event_id===e.id)?.attendance??"pending"]}</p></div><Link href={`/admin/seguimiento/agenda/${e.id}`} prefetch={false}>Abrir actividad →</Link></article>)}</div>:<StatePanel title="Sin actividades en esta semana" description="Programa una actividad o consulta otra semana. No se interpreta como inasistencia."/>}
    </AdminPanel>
    <AdminPanel title="Plan personal referido" description="Creado y completado por el paciente; no acredita que una sesión profesional haya ocurrido.">{data.plans.map(p=><article className="care-card" key={p.id}><div><h3>{p.title}</h3><p>{careTimestamp(p.planned_for)} · {planStatusLabels[p.status]}</p></div></article>)}{!data.plans.length&&<p>Sin planificación personal en esta semana.</p>}</AdminPanel>
    <AdminPanel title="Compromisos" description="Pendientes primero. Se distingue realización declarada de verificación profesional.">{write&&<details><summary>Crear compromiso</summary><CommitmentForm action={staffPlanningAction} pid={id} responsibles={choices}/></details>}
      <div className="care-cards">{data.commitments.map(c=><article className="care-card" key={c.id} id={`compromiso-${c.id}`}><div><h3>{c.title}</h3><p>{commitmentStatus(c)} · Fecha prevista {careTimestamp(c.due_at)}</p><p className="care-subtle">{c.visibility==="patient"?"Compartido con el paciente":"Solo coordinación"} · Responsable: {c.responsible_kind==="patient"?"paciente":"profesional"}</p>{c.result&&<p>{c.result}</p>}
      {write&&c.status==="pending"&&<>{!c.source_personal_proposal_id&&<details><summary>Editar o reprogramar</summary><CommitmentForm action={staffPlanningAction} pid={id} commitment={c}/></details>}<CompleteCommitmentForm action={staffPlanningAction} commitment={c}/></>}
      {write&&c.status==="completed"&&c.confirmation==="self"&&<CompleteCommitmentForm action={staffPlanningAction} commitment={c} verify/>}
      {c.source_personal_proposal_id&&<p><Link href={`/admin/seguimiento/pacientes/${id}/recovery/autonomia-personal#acuerdo-${c.source_personal_proposal_id}`} prefetch={false}>Ver acuerdo, revisiones y evidencia en Autonomía</Link></p>}<details><summary>Historial del compromiso</summary><ol className="care-history">{history.data?.filter(h=>h.commitment_id===c.id).map(h=><li key={h.id}><p>{h.title} · Fecha prevista {careTimestamp(h.due_at)}</p><p>{h.reason} · {careTimestamp(h.recorded_at)} · versión {h.version}</p></li>)}</ol></details></div></article>)}</div>{!data.commitments.length&&<p>No hay compromisos registrados en esta página.</p>}
    </AdminPanel>
  </>;
}
