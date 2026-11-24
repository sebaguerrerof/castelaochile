import Link from "next/link";
import { agreementStates,type SharedAgreements } from "@/lib/care/recovery-family";
import { patientPlanning } from "@/lib/care/planning-server";
import { carePage } from "@/lib/care/policy";
import { careTimestamp } from "@/lib/care/time";
import { commitmentStatus } from "@/lib/care/planning";
import { CommitmentForm, CompleteCommitmentForm } from "@/components/care/planning-forms";
import { patientPlanningAction } from "../../care-actions";
export default async function PatientCommitmentsPage({searchParams}:{searchParams:Promise<{pagina?:string;acuerdos?:string}>}) {
  const query=await searchParams;const page=carePage(query.pagina);const {client,patient,data}=await patientPlanning(undefined,page);
  const agreementPage=carePage(query.acuerdos);const shared=await client.rpc("care_family_shared",{pid:patient.id,page:agreementPage});if(shared.error)throw new Error("No fue posible leer los acuerdos compartidos.");const agreements=shared.data as unknown as SharedAgreements;
  const history=data.commitments.length?await client.from("care_commitment_history").select("*").eq("visibility","patient").in("commitment_id",data.commitments.map(c=>c.id)).order("version",{ascending:false}):{data:[],error:null};
  if(history.error)throw new Error("No fue posible cargar los cambios de tus compromisos.");
  return <div className="care-patient-workspace"><p className="library-eyebrow">Responsabilidades compartidas</p><h1>Mis compromisos</h1><p className="library-lead">Revisa tus acuerdos y registra cómo resultaron. Tu confirmación se distingue de la verificación del profesional.</p>
    <section className="library-panel"><h2>Crear mi compromiso</h2><CommitmentForm action={patientPlanningAction} pid={patient.id} patientMode/></section>
    <section className="library-panel"><h2>Compromisos compartidos</h2><div className="care-cards">{data.commitments.map(c=><article className="care-card" key={c.id} id={`compromiso-${c.id}`}><div><h3>{c.title}</h3><p>{commitmentStatus(c)} · Fecha prevista {careTimestamp(c.due_at)}</p><p className="care-subtle">{c.origin==="self"?"Creado por ti":"Acordado con el equipo"} · {c.responsible_kind==="patient"?"Lo realizas tú":"Lo realiza el profesional"}</p>{c.result&&<p>{c.result}</p>}
      {c.status==="pending"&&c.responsible_kind==="patient"&&<CompleteCommitmentForm action={patientPlanningAction} commitment={c}/>}
      {c.status==="pending"&&c.origin==="self"&&!c.source_personal_proposal_id&&<details><summary>Editar o reprogramar mi compromiso</summary><CommitmentForm action={patientPlanningAction} pid={patient.id} commitment={c} patientMode/></details>}
      {c.source_personal_proposal_id&&<p><Link href={`/pacientes/autonomia#acuerdo-${c.source_personal_proposal_id}`} prefetch={false}>Ver acuerdo, revisiones y evidencia en Autonomía</Link></p>}<details><summary>Historial compartido</summary><ol className="care-history">{history.data?.filter(h=>h.commitment_id===c.id).map(h=><li key={h.id}><p>Fecha prevista {careTimestamp(h.due_at)} · {h.reason}</p><p>Registrado {careTimestamp(h.recorded_at)} · versión {h.version}</p></li>)}</ol></details>
    </div></article>)}</div>{!data.commitments.length&&<p>No tienes compromisos compartidos en esta página.</p>}
    <nav className="care-nav" aria-label="Páginas de compromisos">{page>1&&<Link href={`?pagina=${page-1}`} prefetch={false}>Anterior</Link>}{page*25<data.commitmentTotal&&<Link href={`?pagina=${page+1}`} prefetch={false}>Siguiente</Link>}</nav></section>
    <section className="library-panel"><h2>Acuerdos compartidos con el equipo</h2><p>Estos acuerdos son verificados por tu equipo. Puedes conversar con tu profesional sobre su seguimiento.</p><div className="care-cards">{agreements.rows.map(a=><article className="care-card" key={a.id}><div><h3>{a.patient_body}</h3><p>{agreementStates[a.state]} · fecha prevista {careTimestamp(a.due_at)}</p></div></article>)}</div>{!agreements.rows.length&&<p>No hay acuerdos compartidos en esta página.</p>}<nav className="care-nav" aria-label="Páginas de acuerdos compartidos">{agreementPage>1&&<Link prefetch={false} href={`?pagina=${page}&acuerdos=${agreementPage-1}`}>Anterior</Link>}{agreementPage*25<agreements.total&&<Link prefetch={false} href={`?pagina=${page}&acuerdos=${agreementPage+1}`}>Siguiente</Link>}</nav></section>
  </div>;
}
