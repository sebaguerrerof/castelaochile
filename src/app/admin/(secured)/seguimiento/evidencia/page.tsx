import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminPanel,PageHeader } from "@/components/admin/admin-ui";
import { CareNav } from "@/components/care/care-nav";
import { requireDashboard } from "@/lib/care/dashboard-server";
import { dashboardDays,dashboardSourcesSchema,sourceLabels,sourceHref } from "@/lib/care/dashboard";
import { carePage,specialtyLabels } from "@/lib/care/policy";
import { careTimestamp } from "@/lib/care/time";
export default async function EvidencePage({searchParams}:{searchParams:Promise<{metrica?:string;periodo?:string;categoria?:string;corte?:string;pagina?:string}>}){
 const {client,caps}=await requireDashboard(),params=await searchParams,days=dashboardDays(params.periodo),page=carePage(params.pagina);
 const metric=params.metrica??"records";if(!["attendance","reports","records"].includes(metric))notFound();
 const category=params.categoria??"",allowed=metric==="attendance"?["present","absent","justified","pending"]:metric==="reports"?["on_time","late","omitted"]:["pending_record"];
 if(category&&!allowed.includes(category))notFound();if(params.corte&&!z.iso.datetime({offset:true}).safeParse(params.corte).success)notFound();
 const result=await client.rpc("care_dashboard_sources",{metric,days,category,page,...(params.corte?{cutoff:params.corte}:{})});if(result.error)throw new Error("No fue posible cargar las fuentes autorizadas. Vuelve al panel para actualizar el corte.");
 const data=dashboardSourcesSchema.parse(result.data),{data:{user}}=await client.auth.getUser();
 const url=(n:number)=>`?metrica=${metric}&periodo=${days}&categoria=${category}&corte=${encodeURIComponent(data.cutoff)}&pagina=${n}`;
 return <><PageHeader title={metric==="records"?"Registros profesionales pendientes":metric==="attendance"?"Fuentes de asistencia":"Fuentes de reportes"} eyebrow="Evidencia autorizada" description={metric==="records"?"Sesiones realizadas que requieren registro del profesional responsable. No se marca atraso sin un plazo institucional aprobado.":"Cada fila representa un participante de actividad o una obligación de reporte; no cuenta pacientes únicos."}/><CareNav caps={caps} active={metric==="records"?"evidence":"sources"}/>
 <p><Link href={`/admin/seguimiento?periodo=${days}`} prefetch={false}>Volver al panel</Link></p><p className="care-subtle">{careTimestamp(data.start_at)} a {careTimestamp(data.cutoff)} · America/Santiago · {data.total} fuentes · Página {page}. El corte se conserva al paginar.</p>
 <form method="get" className="care-search"><input type="hidden" name="metrica" value={metric}/><label>Periodo operativo<select aria-label="Periodo operativo" name="periodo" defaultValue={days}><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select></label><label>Estado<select aria-label="Estado" name="categoria" defaultValue={category}><option value="">Todos</option>{allowed.map(a=><option value={a} key={a}>{sourceLabels[a]}</option>)}</select></label><button className="admin-button admin-button-secondary">Actualizar fuentes</button></form>
 <AdminPanel title="Registros que sustentan la cifra">{data.rows.length?<table className="care-data-table care-source-table"><caption>{data.total} fuentes autorizadas{category?` · ${sourceLabels[category]}`:""}</caption><thead><tr><th scope="col">Paciente</th><th scope="col">Fuente / estado</th><th scope="col">Fecha</th><th scope="col">Acción</th></tr></thead><tbody>{data.rows.map(r=><tr key={`${r.patient_id}-${r.source_id}-${r.specialty}`}><td data-label="Paciente">{r.display_name}</td><td data-label="Fuente / estado">{r.label==="morning"?"Reporte de mañana":r.label==="evening"?"Reporte de noche":r.label}<br/>{sourceLabels[r.category]}{r.specialty?` · ${specialtyLabels[r.specialty as keyof typeof specialtyLabels]}`:""}</td><td data-label="Fecha">{careTimestamp(r.occurred_at)}</td><td data-label="Acción"><Link href={sourceHref(metric,r,caps.includes("care.records.create")&&r.professional_id===user?.id)} prefetch={false}>{metric==="records"&&caps.includes("care.records.create")&&r.professional_id===user?.id?"Completar registro":"Abrir fuente autorizada"}</Link></td></tr>)}</tbody></table>:<p>No hay fuentes en este periodo y estado. Un conjunto vacío no acredita recuperación ni estabilidad.</p>}
 <nav className="care-nav" aria-label="Páginas de fuentes">{page>1&&<Link href={url(page-1)} prefetch={false}>Anterior</Link>}{data.total>page*25&&<Link href={url(page+1)} prefetch={false}>Siguiente</Link>}</nav></AdminPanel></>;
}
