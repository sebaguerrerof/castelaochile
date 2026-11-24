import Link from "next/link";
import { patientPlanning } from "@/lib/care/planning-server";
import { carePage } from "@/lib/care/policy";
import { careTimestamp } from "@/lib/care/time";
import { attendanceLabels, eventStatusLabels, planStatusLabels } from "@/lib/care/planning";
import { CompletePlanForm, PlanForm } from "@/components/care/planning-forms";
import { WeekSelector } from "@/components/care/week-selector";
import { patientPlanningAction } from "../../care-actions";
export default async function PatientPlanningPage({searchParams}:{searchParams:Promise<{semana?:string;pagina?:string}>}) {
  const query=await searchParams;const page=carePage(query.pagina);const {client,data}=await patientPlanning(query.semana,page);
  const history=data.plans.length?await client.from("care_plan_history").select("*").in("plan_id",data.plans.map(p=>p.id)).order("version",{ascending:false}):{data:[],error:null};
  if(history.error)throw new Error("No fue posible cargar los cambios de tu plan.");
  return <div className="care-patient-workspace"><p className="library-eyebrow">Mi planificación</p><h1>Mi semana</h1><p className="library-lead">Consulta actividades del equipo y organiza tus planes personales. Marcar un plan realizado registra tu propio reporte.</p>
    <WeekSelector range={data.range} total={Math.max(data.total,data.planTotal)} page={page} base="/pacientes/planificacion"/>
    <section className="library-panel"><h2>Actividades del equipo</h2><div className="care-cards">{data.events.map(e=><article className="care-card" key={e.id}><div><h3>{e.title}</h3><p>{careTimestamp(e.starts_at)} · {eventStatusLabels[e.status]}</p><p>{attendanceLabels[data.participants.find(p=>p.event_id===e.id)?.attendance??"pending"]}</p><p>{e.location}</p></div></article>)}</div>{!data.events.length&&<p>No tienes actividades del equipo programadas en esta semana. Puedes revisar otra semana.</p>}</section>
    <section className="library-panel"><h2>Añadir mi actividad</h2><PlanForm action={patientPlanningAction}/></section>
    <section className="library-panel"><h2>Mi plan personal</h2><div className="care-cards">{data.plans.map(p=><article className="care-card" key={p.id}><div><h3>{p.title}</h3><p>{careTimestamp(p.planned_for)} · {planStatusLabels[p.status]}</p>{p.status==="planned"&&<><CompletePlanForm action={patientPlanningAction} plan={p}/><details><summary>Editar, reprogramar o cancelar</summary><PlanForm action={patientPlanningAction} plan={p}/></details></>}
      <details><summary>Ver cambios anteriores</summary><ol className="care-history">{history.data?.filter(h=>h.plan_id===p.id).map(h=><li key={h.id}><p>{h.title} · {careTimestamp(h.planned_for)}</p><p>{h.reason} · versión {h.version}</p></li>)}</ol></details></div></article>)}</div>{!data.plans.length&&<p>Todavía no tienes planes personales en esta semana.</p>}</section>
    <Link href="/pacientes/biblioteca" prefetch={false}>Ir a mi biblioteca</Link>
  </div>;
}
