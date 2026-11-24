import { AdminPanel,PageHeader } from "@/components/admin/admin-ui";
import { PatientFileNav } from "@/components/care/patient-file-nav";
import { CareField,CareForm } from "@/components/care/care-form";
import { EnrolForm,ReportExceptionForm } from "@/components/care/report-forms";
import { ReportStatus } from "@/components/care/report-status";
import { carePatient,getCareCapabilities } from "@/lib/care/server";
import { reportsForDay } from "@/lib/care/report-server";
import { reportDay,reportFieldLabels,reportKindLabels } from "@/lib/care/reports";
import { careTimestamp } from "@/lib/care/time";
import { staffReportAction } from "../../../report-actions";
import { forbidden } from "next/navigation";
export default async function StaffReportsPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{dia?:string}>}) {
  const {id}=await params;const {client,patient}=await carePatient(id);const caps=await getCareCapabilities();const {dia}=await searchParams;
  const manager=caps.includes("care.assignments.manage");const canRead=caps.includes("care.records.read");if(!manager&&!canRead)forbidden();const data=await reportsForDay(client,id,dia);
  const enrol=await client.from("care_report_enrolments").select("*").eq("patient_id",id).maybeSingle();
  const exceptions=manager?await client.from("care_report_exemptions").select("*").eq("patient_id",id).order("revision",{ascending:false}).limit(20):{data:[],error:null};
  if(enrol.error||exceptions.error)throw new Error("No fue posible cargar la incorporación a reportes.");
  const comments=canRead?await Promise.all(data.reports.map(async r=>{const result=await client.rpc("care_report_review_comments",{rid:r.id});if(result.error)throw new Error("No fue posible leer revisiones autorizadas.");return {id:r.id,notes:result.data as {review_id:string;comment:string;version:number;reviewed_at:string}[]};})):[];
  return <><PageHeader title={patient.display_name} eyebrow="Reportes diarios" description="Autorreporte del paciente; el borrador no se comparte y no cuenta como envío."/><PatientFileNav autonomyAllowed={caps.includes("care.records.read")} familyAllowed={caps.includes("care.records.read")&&caps.includes("care.family.read")} followupAllowed={caps.includes("care.records.read")} recordsAllowed={caps.includes("care.records.read")||caps.includes("care.records.create")} id={id} active="reports"/>
    <form method="get" className="care-search"><label>Día de Chile<input type="date" name="dia" max={reportDay()} defaultValue={data.day}/></label><button className="admin-button admin-button-secondary">Ver día</button></form>
    <div className="care-grid">{data.slots.map(s=><ReportStatus key={s.kind} slot={s}/>)}</div>
    {!canRead&&<p>Tu perfil consulta obligaciones; la lectura del contenido requiere el permiso independiente de registros.</p>}
    {data.reports.map(r=>{const o=data.obligations.find(o=>o.id===r.id)!;return <AdminPanel key={r.id} title={`Autorreporte de ${reportKindLabels[o.kind].toLowerCase()}`} description={`Primer envío ${careTimestamp(r.first_submitted_at)} · versión ${r.version}${r.version>1?" (editado)":""}`}>
      <dl>{o.fields.map(f=><div key={f}><dt><strong>{reportFieldLabels[f]}</strong></dt><dd>{r.answers[f]||"Sin respuesta opcional"}</dd></div>)}</dl>
      <p>{data.reviews.some(v=>v.report_id===r.id&&v.reviewed_version===r.version)?"Versión actual revisada.":"Versión actual pendiente de revisión."}</p>
      {caps.includes("care.records.create")&&canRead&&<details><summary>Registrar revisión profesional</summary><CareForm action={staffReportAction} label="Registrar revisión"><input type="hidden" name="op" value="review"/><input type="hidden" name="obligation_id" value={r.id}/><input type="hidden" name="report_version" value={r.version}/><CareField name="comment" label="Comentario de coordinación (no visible al paciente)"><textarea rows={2} maxLength={600}/></CareField></CareForm></details>}
      <details><summary>Historial de reportes enviados</summary><ol className="care-history">{data.revisions.filter(h=>h.report_id===r.id).map(h=><li key={h.id}><p>Versión {h.version} · {careTimestamp(h.recorded_at)} · {h.reason}</p><dl>{o.fields.map(f=><div key={f}><dt>{reportFieldLabels[f]}</dt><dd>{h.answers[f]||"Sin respuesta opcional"}</dd></div>)}</dl></li>)}</ol></details>
      <details><summary>Revisiones internas autorizadas</summary><ol className="care-history">{comments.find(c=>c.id===r.id)?.notes.map(n=><li key={n.review_id}>Versión {n.version} · {careTimestamp(n.reviewed_at)}<p>{n.comment||"Revisión sin comentario adicional."}</p></li>)}</ol></details>
    </AdminPanel>;})}
    {manager&&<AdminPanel title="Incorporación y excepciones" description="No recalculan plazos cerrados. Las excepciones con horario se aplican solo antes de generar la obligación."><details><summary>Periodo de reportes del paciente</summary><EnrolForm pid={id} enrol={enrol.data} action={staffReportAction}/></details><details><summary>Eximir un periodo</summary><ReportExceptionForm pid={id} action={staffReportAction}/></details><details><summary>Ventana excepcional de este paciente</summary><ReportExceptionForm pid={id} action={staffReportAction} window/></details><details><summary>Últimas 20 excepciones internas</summary><ol className="care-history">{exceptions.data?.map(e=><li key={e.id}>{e.starts_on} al {e.ends_on} · {e.kind==="both"?"Ambos":reportKindLabels[e.kind]}<p>{e.reason}</p><p>{e.opens_local?`Ventana ${e.opens_local} a ${e.closes_local}`:"Exento"}</p></li>)}</ol></details></AdminPanel>}
  </>;
}
