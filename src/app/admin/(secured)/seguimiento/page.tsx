import Link from "next/link";
import { forbidden } from "next/navigation";
import { PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { CareNav } from "@/components/care/care-nav";
import { requireAdmin } from "@/lib/auth/admin";
import { careDirectory, careEnabled, getCareCapabilities } from "@/lib/care/server";
import { carePage } from "@/lib/care/policy";
import { DashboardView } from "@/components/care/dashboard-view";

export default async function CareDirectoryPage({searchParams}:{searchParams:Promise<{q?:string;pagina?:string;periodo?:string;filtro?:string}>}) {
  const admin=await requireAdmin();
  if(!careEnabled())return <StatePanel title="Seguimiento no habilitado" description="Este entorno todavía no tiene habilitado el módulo de atención." tone="disabled"/>;
  const caps=await getCareCapabilities();
  if(!caps.includes("care.directory.read")&&admin.role!=="superadmin"&&!caps.includes("care.assignments.manage"))forbidden();
  const params=await searchParams;if(caps.includes("care.patient.read")&&caps.includes("care.records.read")&&caps.includes("care.directory.read"))return <DashboardView params={params}/>;
  const q=(params.q??"").slice(0,100);const page=carePage(params.pagina);
  const data=caps.includes("care.directory.read")?await careDirectory(q,page):null;
  const url=(n:number)=>`/admin/seguimiento?q=${encodeURIComponent(q)}&pagina=${n}`;
  return <><PageHeader eyebrow="Atención y coordinación" title="Seguimiento terapéutico" description="Revisa los pacientes de tu alcance y abre su ficha para coordinar la siguiente acción."/>
    <CareNav caps={caps} technical={admin.role==="superadmin"} active="patients"/>
    {!data?<StatePanel title="Configura el equipo" description="Esta cuenta puede configurar accesos. La lectura de fichas requiere capacidades y asignaciones explícitas." action={<Link href="/admin/seguimiento/equipo" prefetch={false}>Ir a equipo y asignaciones</Link>}/>:
      <><form className="admin-form care-search" method="get"><label>Buscar paciente<input type="search" name="q" defaultValue={q} maxLength={100}/></label><button className="admin-button admin-button-secondary">Buscar</button></form>
      <p className="care-subtle">{data.total} pacientes autorizados · Página {page}. La habilitación de acceso es independiente del estado del tratamiento.</p>
      {data.patients.length?<div className="care-cards">{data.patients.map(patient=><article className="care-card" key={patient.id}><div><h2>{patient.display_name}</h2><span className="care-badge">Acceso {patient.is_active?"habilitado":"suspendido"}</span></div>{caps.includes("care.patient.read")&&<Link href={`/admin/seguimiento/pacientes/${patient.id}`} prefetch={false}>Abrir ficha →</Link>}</article>)}</div>:<StatePanel title={q?"Sin coincidencias":"Sin pacientes asignados"} description={q?"Prueba otro nombre dentro de tu alcance.":"Solicita una asignación vigente al coordinador para comenzar. No se muestran pacientes ajenos."}/>}
      <nav className="care-nav" aria-label="Páginas de pacientes">{page>1&&<Link href={url(page-1)} prefetch={false}>Anterior</Link>}{page*25<data.total&&<Link href={url(page+1)} prefetch={false}>Siguiente</Link>}</nav></>}
  </>;
}
