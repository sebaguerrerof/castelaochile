import Link from "next/link";
import { randomUUID } from "node:crypto";
import { patientReportEditor } from "@/lib/care/report-server";
import { reportFieldLabels,reportKindLabels } from "@/lib/care/reports";
import { careTimestamp } from "@/lib/care/time";
import { CareForm } from "@/components/care/care-form";
import { ReportInputs } from "@/components/care/report-inputs";
import { ReportReadingNotice } from "@/components/care/report-status";
import { patientReportAction } from "../../../report-actions";
export default async function PatientReportPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const {editor,client}=await patientReportEditor(id);const {obligation:o,draft,report}=editor;
  const [history,reviews]=await Promise.all([client.from("care_report_revisions").select("*").eq("report_id",id).order("version",{ascending:false}),client.from("care_report_reviews").select("*").eq("report_id",id).order("reviewed_at",{ascending:false})]);
  if(history.error||reviews.error)throw new Error("No fue posible cargar el historial del reporte.");
  const reviewed=report&&reviews.data.some(r=>r.reviewed_version===report.version);
  return <div className="care-patient-workspace"><Link href={`/pacientes/reportes?dia=${o.local_day}`} prefetch={false}>← Volver a mis reportes</Link><h1>Reporte de {reportKindLabels[o.kind].toLowerCase()}</h1><p className="library-lead">{o.local_day} · Autorreporte · plazo {careTimestamp(o.closes_at)}</p>
    <ReportReadingNotice/>
    {report&&<section className="library-panel"><h2>Mi reporte enviado</h2><p>Primer envío {careTimestamp(report.first_submitted_at)} · {Date.parse(report.first_submitted_at)<=Date.parse(o.closes_at)?"En plazo":"Tardío"} · versión {report.version}{report.version>1?" (editado)":""}</p><p>{reviewed?"El equipo revisó esta versión.":"Esta versión aún no tiene revisión registrada."}</p><dl>{o.fields.map(f=><div key={f}><dt><strong>{reportFieldLabels[f]}</strong></dt><dd>{report.answers[f]||"Sin respuesta opcional"}</dd></div>)}</dl></section>}
    {o.required?<section className="library-panel"><h2>{report?"Corregir mi reporte":"Completar mi reporte"}</h2><p>El borrador es privado. Enviar comparte el contenido con los profesionales autorizados; corregir conserva el envío original y las versiones anteriores.</p>{draft&&<p>Borrador guardado {careTimestamp(draft.saved_at)}; aún no enviado.</p>}
      <CareForm action={patientReportAction} label="Guardar borrador" submitVariant="secondary"><input type="hidden" name="obligation_id" value={id}/><input type="hidden" name="report_version" value={report?.version??0}/><input type="hidden" name="draft_version" value={draft?.version??0}/><input type="hidden" name="submission_key" value={randomUUID()}/><ReportInputs key={`${id}-${report?.version??0}-${draft?.version??0}`} fields={o.fields} requiredFields={o.required_fields} initial={draft?.answers??report?.answers??{}} correction={Boolean(report)}/></CareForm>
    </section>:<p>Este reporte está exento. No requiere envío.</p>}
    {history.data.length>0&&<section className="library-panel"><h2>Versiones enviadas</h2><details><summary>Ver historial de envío y correcciones</summary><ol className="care-history">{history.data.map(h=><li key={h.id}><p>Versión {h.version} · {careTimestamp(h.recorded_at)} · {h.reason}</p><dl>{o.fields.map(f=><div key={f}><dt>{reportFieldLabels[f]}</dt><dd>{h.answers[f]||"Sin respuesta opcional"}</dd></div>)}</dl></li>)}</ol></details></section>}
  </div>;
}
