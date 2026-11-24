import { PageHeader } from "@/components/admin/admin-ui";
import { CareNav } from "@/components/care/care-nav";
import { RecoverySupervision } from "@/components/care/recovery-supervision";
import { RecoverySupervisionFilters } from "@/components/care/recovery-supervision-filters";
import { recoverySupervisionContext,type RecoverySupervisionQuery } from "@/lib/care/recovery-coach-server";
import Link from "next/link";
import { carePage } from "@/lib/care/policy";
export default async function RecoverySupervisionPage({searchParams}:{searchParams:Promise<RecoverySupervisionQuery>}){
 const query=await searchParams,c=await recoverySupervisionContext(query);
 const href=(patch:Record<string,string>)=>"/admin/seguimiento/recovery?"+new URLSearchParams({periodo:c.period,tipo:c.kind,categoria:c.category,q:query.q??"",nomina:query.nomina??"1",...(query.grupo?{grupo:query.grupo}:{}),...(c.patient?{paciente:c.patient}:{}),...patch});
 return <><PageHeader eyebrow="Seguimiento" title="Supervisión Recovery" description="Actividades, apoyo y compromisos verificables de tus pacientes autorizados. Cada cifra abre sus fuentes; no es una calificación clínica."/><CareNav compact caps={c.caps} active="recovery"/>
 <RecoverySupervisionFilters query={query} period={c.period} kind={c.kind} category={c.category} groups={c.options.groups} patients={c.directory.patients}/><nav className="care-nav" aria-label="Nómina de pacientes Recovery">{carePage(query.nomina)>1&&<Link href={href({nomina:String(carePage(query.nomina)-1)})} prefetch={false}>Pacientes anteriores</Link>}{carePage(query.nomina)*25<c.directory.total&&<Link href={href({nomina:String(carePage(query.nomina)+1)})} prefetch={false}>Más pacientes</Link>}</nav><RecoverySupervision data={c.data} kind={c.kind} category={c.category} page={c.page} href={href}/></>;
}
