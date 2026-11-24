import { AdminPanel,PageHeader } from "@/components/admin/admin-ui";
import { CareNav } from "@/components/care/care-nav";
import { RuleForm } from "@/components/care/report-forms";
import { requireCare,getCareCapabilities } from "@/lib/care/server";
import { reportKindLabels,reportFieldLabels } from "@/lib/care/reports";
import { staffReportAction } from "../../report-actions";
export default async function ReportConfigurationPage() {
  const {client}=await requireCare("care.assignments.manage");const caps=await getCareCapabilities();
  const rules=await client.from("care_report_rules").select("*").order("revision",{ascending:false}).limit(20);
  if(rules.error)throw new Error("No fue posible cargar las reglas aprobadas.");
  return <><PageHeader title="Configuración de reportes" eyebrow="Dirección" description="Define campos y ventanas aprobadas antes de incorporar pacientes. No se incluyen horarios ni escalas clínicas predeterminados."/><CareNav caps={caps} active="reports"/>
    <div className="care-grid">{(["morning","evening"] as const).map(k=><AdminPanel key={k} title={`Regla de ${reportKindLabels[k].toLowerCase()}`} description="Crea una versión vigente desde hoy o una fecha futura."><RuleForm kind={k} action={staffReportAction}/></AdminPanel>)}</div>
    <AdminPanel title="Últimas 20 configuraciones" description="Versiones inmutables; cada obligación conserva su regla y plazo originales.">{rules.data.length?rules.data.map(r=><article className="care-card" key={r.id}><div><h3>{reportKindLabels[r.kind]} · desde {r.effective_on}</h3><p>{r.opens_local} a {r.closes_local}{r.close_next_day?" del día siguiente":""} · Chile</p><p>{r.basis==="active_days"?"Días activos":"Días activos con agenda"} · días ISO {r.weekdays.join(", ")}</p><p>Campos: {r.fields.map(f=>reportFieldLabels[f]).join("; ")}</p><p>{r.reason}</p></div></article>):<p>Sin reglas aprobadas. No se generan obligaciones ni omisiones.</p>}</AdminPanel>
  </>;
}
