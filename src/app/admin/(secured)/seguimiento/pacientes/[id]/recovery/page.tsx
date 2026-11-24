import { PageHeader } from "@/components/admin/admin-ui";
import { PatientFileNav } from "@/components/care/patient-file-nav";
import { RecoveryCommitments } from "@/components/care/recovery-commitments";
import { RecoverySupervision } from "@/components/care/recovery-supervision";
import { RecoverySupervisionFilters } from "@/components/care/recovery-supervision-filters";
import { RecoveryWeeklyChart } from "@/components/care/recovery-weekly-chart";
import { careLocalInput } from "@/lib/care/time";
import { recoverySupervisionContext,recoveryWeeklySeries,type RecoverySupervisionQuery } from "@/lib/care/recovery-coach-server";
import { recoveryCommitments } from "@/lib/care/recovery-coach-server";
import Link from "next/link";
export default async function RecoveryPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<RecoverySupervisionQuery>}){
  const {id}=await params;const query=await searchParams;const {patient,rows,canWrite,cutoff,caps}=await recoveryCommitments(id);
  const supervision=caps.includes("care.directory.read")?await recoverySupervisionContext(query,id):null;
  const period=supervision?.period??"30",last=careLocalInput(new Date(cutoff)).slice(0,10),first=supervision?.data.start_at?careLocalInput(supervision.data.start_at).slice(0,10):careLocalInput(new Date(cutoff-29*86400000)).slice(0,10);
  const series=await recoveryWeeklySeries(id,first,last);
  const href=(patch:Record<string,string>)=>`/admin/seguimiento/pacientes/${id}/recovery?`+new URLSearchParams({periodo:period,tipo:supervision?.kind??"activity",categoria:supervision?.category??"",...patch});
  return <><PageHeader eyebrow="Recovery" title={patient.display_name} description="Actividad cualitativa, evidencia y compromisos verificables. Rúbrica propuesta pendiente; sin calificación automática."/>
    <PatientFileNav id={id} active="recovery" recordsAllowed autonomyAllowed followupAllowed/>
    <nav className="care-nav" aria-label="Recovery"><Link prefetch={false} href={`/admin/seguimiento/pacientes/${id}/recovery/autonomia-personal`}>Autonomía y mis acuerdos</Link><Link prefetch={false} href={`/admin/seguimiento/pacientes/${id}/recovery/semanal`}>Revisión semanal de las ocho dimensiones</Link><Link prefetch={false} href={`/admin/seguimiento/pacientes/${id}/registros`}>Registrar actividad desde agenda</Link></nav>
    {supervision&&<><RecoverySupervisionFilters pid={id} query={query} period={period} kind={supervision.kind} category={supervision.category} groups={[]}/><RecoverySupervision data={supervision.data} kind={supervision.kind} category={supervision.category} page={supervision.page} href={href}/></>}
    <RecoveryWeeklyChart pid={id} rows={series.rows} rubrics={series.rubrics} first={first} last={last}/>
    <RecoveryCommitments pid={id} rows={rows} canWrite={canWrite} cutoff={cutoff}/>
  </>;
}
