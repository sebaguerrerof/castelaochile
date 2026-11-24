import { RecoveryAlertEvidence } from "@/components/care/recovery-alert-evidence";
import { alertKindLabels } from "@/lib/care/dashboard";
import Link from "next/link";
import { AdminPanel,PageHeader } from "@/components/admin/admin-ui";
import { CareNav } from "@/components/care/care-nav";
import { requireDashboard } from "@/lib/care/dashboard-server";
import { dashboardAlertsSchema } from "@/lib/care/dashboard";
import { carePage } from "@/lib/care/policy";
import { careTimestamp,careLocalInput } from "@/lib/care/time";
import { AlertReviewForm } from "@/components/care/alert-review-form";
export default async function AlertsPage({searchParams}:{searchParams:Promise<{estado?:string;pagina?:string}>}){
 const {client,caps}=await requireDashboard(),params=await searchParams,page=carePage(params.pagina),state=["open","received","resolved","all","pending"].includes(params.estado??"")?params.estado!:"pending";
 const sync=await client.rpc("care_dashboard_sync");if(sync.error)throw new Error("No fue posible actualizar alertas operativas.");const result=await client.rpc("care_dashboard_alerts",{page,state});if(result.error)throw new Error("No fue posible cargar alertas autorizadas.");const data=dashboardAlertsSchema.parse(result.data);
 const obligationIds=data.alerts.filter(a=>a.kind==="report_omitted").map(a=>a.source_id),commitmentIds=data.alerts.filter(a=>a.kind==="commitment_overdue").map(a=>a.source_id);
 const [obligations,commitments]=await Promise.all([obligationIds.length?client.from("care_report_obligations").select("id,local_day").in("id",obligationIds):Promise.resolve({data:[],error:null}),commitmentIds.length?client.from("care_commitments").select("id,due_at").in("id",commitmentIds):Promise.resolve({data:[],error:null})]);if(obligations.error||commitments.error)throw new Error("No fue posible cargar los orígenes autorizados.");
 const url=(n:number)=>`?estado=${state}&pagina=${n}`;
 return <><PageHeader title="Alertas operativas" eyebrow="Coordinación" description="Obligaciones generadas y cerradas sin envío, o compromisos pendientes con fecha vencida. Son hechos operativos; no asignan una valoración clínica."/><CareNav caps={caps} active="alerts"/>
 <form className="care-search" method="get"><label>Estado de alerta<select aria-label="Estado de alerta" name="estado" defaultValue={state}><option value="pending">Sin resolver</option><option value="open">Abiertas</option><option value="received">Recibidas</option><option value="resolved">Resueltas</option><option value="all">Todas</option></select></label><button className="admin-button admin-button-secondary">Filtrar alertas</button></form><p className="care-subtle">{data.total} alertas · Página {page}. Regla y versión conservadas por origen; una alerta por obligación, compromiso o versión autorizada de reiteración. Si cambia el origen, la alerta conserva su historia hasta resolución explícita.</p>
 {data.last_action&&<p role="status" className="admin-notice">Tu última gestión registrada: {data.last_action.state==="received"?"recepción de alerta":"resolución de alerta"} · {careTimestamp(data.last_action.at)}. El registro permanece en el historial.</p>}
 <AdminPanel title="Revisar y coordinar">{data.alerts.length?data.alerts.map(a=>{
 const root=`/admin/seguimiento/pacientes/${a.patient_id}`,day=obligations.data?.find(o=>o.id===a.source_id)?.local_day,due=commitments.data?.find(c=>c.id===a.source_id)?.due_at;
 const href=a.kind==="recovery_repeated_unfulfilled"?`${root}/recovery`:a.kind==="report_omitted"?`${root}/reportes${day?`?dia=${day}`:""}`:`${root}/planificacion${due?`?semana=${careLocalInput(due).slice(0,10)}`:""}`;
 return <article className="care-card" key={a.id}><div><h3>{a.display_name} · {alertKindLabels[a.kind]}</h3><p>{careTimestamp(a.triggered_at)} · {a.state==="open"?"Abierta":a.state==="received"?"Recibida":"Resuelta"}</p><p><Link href={href} prefetch={false}>Abrir origen autorizado</Link> · <Link href={`${root}/seguimiento`} prefetch={false}>Seguimiento e historial</Link></p>{a.kind==="recovery_repeated_unfulfilled"&&<RecoveryAlertEvidence id={a.id}/>} {caps.includes("care.alerts.review")&&<details><summary>Gestionar recepción o resolución</summary><AlertReviewForm id={a.id} version={a.version} state={a.state}/></details>}</div></article>;
 }):<p>Sin alertas en este estado. Esto no acredita estabilidad clínica.</p>}<nav className="care-nav" aria-label="Páginas de alertas">{page>1&&<Link href={url(page-1)} prefetch={false}>Anterior</Link>}{data.total>page*25&&<Link href={url(page+1)} prefetch={false}>Siguiente</Link>}</nav></AdminPanel></>;
}
