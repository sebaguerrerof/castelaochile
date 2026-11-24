import Link from "next/link";
import { patientPlanning } from "@/lib/care/planning-server";
import { careTimestamp } from "@/lib/care/time";
import { commitmentStatus } from "@/lib/care/planning";
import type { CareEvent } from "@/types/care";
import { reportsForDay } from "@/lib/care/report-server";
import { ReportStatus } from "@/components/care/report-status";
import { PatientRecordSummariesPanel,type PatientRecordSummaries } from "@/components/care/patient-record-summaries";
export default async function PatientToday() {
  const {client,patient,data}=await patientPlanning();const now=new Date();const until=new Date(now.getTime()+86400000);
  const [agenda,plans,commitments]=await Promise.all([client.rpc("care_next_activity",{pid:patient.id,start_at:now.toISOString(),end_at:until.toISOString()}),client.from("care_personal_plans").select("*").eq("patient_id",patient.id).eq("status","planned").gte("planned_for",now.toISOString()).lt("planned_for",until.toISOString()).order("planned_for").limit(5),client.from("care_commitments").select("*").eq("patient_id",patient.id).eq("visibility","patient").eq("status","pending").eq("responsible_kind","patient").order("due_at").order("id").limit(1)]);
  if(agenda.error||plans.error||commitments.error)throw new Error("No fue posible cargar tus próximas actividades.");
  const upcoming=agenda.data as CareEvent|null;const commitment=commitments.data[0];
  const reports=await reportsForDay(client,patient.id);
  const shared=await client.rpc("care_record_shared",{pid:patient.id});if(shared.error)throw new Error("No fue posible cargar tus resúmenes compartidos.");
  return <div className="care-patient-workspace"><p className="library-eyebrow">Mi día</p><h1>Hoy</h1><p className="library-lead">Tus próximas 24 horas y el siguiente compromiso que puedes realizar. Horarios de Chile.</p>
    <div className="care-grid"><section className="library-panel"><h2>Próxima actividad del equipo</h2>{upcoming?<><h3>{upcoming.title}</h3><p>{careTimestamp(upcoming.starts_at)}</p><p>{upcoming.modality==="remote"?"Remota":"Presencial"} {upcoming.location}</p></>:<p>No tienes actividades del equipo programadas en las próximas 24 horas.</p>}<Link href="/pacientes/planificacion" prefetch={false}>Ver mi semana →</Link></section>
    <section className="library-panel"><h2>Mi compromiso prioritario</h2>{commitment?<><h3>{commitment.title}</h3><p>{commitmentStatus(commitment)} · {careTimestamp(commitment.due_at)}</p></>:<p>No tienes compromisos pendientes compartidos para realizar.</p>}<Link href="/pacientes/compromisos" prefetch={false}>Revisar compromisos →</Link></section></div>
    <section className="library-panel"><h2>Lo que planifiqué</h2>{plans.data.length?<ul>{plans.data.map(p=><li key={p.id}>{p.title} · {careTimestamp(p.planned_for)}</li>)}</ul>:<p>Aún no planificaste actividades personales para las próximas 24 horas.</p>}<Link href="/pacientes/planificacion" prefetch={false}>Añadir una actividad personal</Link></section>
    {data.goals?.objectives&&<section className="library-panel"><h2>Mis objetivos acordados</h2><p>{data.goals.objectives}</p></section>}
    <section className="library-panel"><h2>Mis reportes de hoy</h2><div className="care-grid">{reports.slots.map(s=><ReportStatus key={s.kind} slot={s} patientMode/>)}</div><Link href="/pacientes/reportes" prefetch={false}>Revisar mis reportes diarios</Link></section>
    <p className="library-lead">Esta información muestra organización y actividades compartidas. No es una evaluación automática de tu recuperación.</p>
    <PatientRecordSummariesPanel data={{...shared.data as PatientRecordSummaries,summaries:(shared.data as PatientRecordSummaries).summaries.slice(0,5)}}/><Link href="/pacientes/resumenes" prefetch={false}>Ver mis resúmenes compartidos →</Link>
  </div>;
}
