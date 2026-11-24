import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { personalAutonomyContext } from "@/lib/care/personal-autonomy-server";
import { personalAutonomyAction } from "@/lib/care/personal-autonomy-actions";
import { personalAgreementSignature, personalOutcomes, personalResponseLabel, type PersonalAssessment, type PersonalCatalog, type PersonalContext } from "@/lib/care/personal-autonomy";
import { careLocalInput, careTimestamp } from "@/lib/care/time";
import { AcceptProposal, ClosingForm, ObservationForm, PersonalWizard, ProposalForm, ReviewForm } from "./personal-autonomy-forms";
import { PageHeader, AdminPanel } from "@/components/admin/admin-ui";
import "./personal-autonomy.css";

type Query = {evaluacion?: string; revision?: string; inicial?: string; editar?: string; version?: string};
const actorName = (data: PersonalContext, id: string) => data.actors.find(a => a.id === id)?.label ?? `Usuario ${id}`;
const sourceId = (a: PersonalAssessment) => `evaluacion-${a.id}-${a.revision}`;
function AssessmentSource({a, catalog, data}: {a: PersonalAssessment; catalog: PersonalCatalog; data: PersonalContext}) {
  return <details className="pa-source" id={sourceId(a)}><summary>{a.baseline_id ? "Reevaluación" : "Evaluación inicial"} · {a.payload.evaluation_date} · revisión {a.revision} · {a.status === "draft" ? "Borrador" : "Enviada"}</summary>
    <p>Autorreporte del paciente · carga {a.mode === "assisted" ? "asistida" : "personal"} por {actorName(data,a.entered_by)} · {careTimestamp(a.recorded_at)}.</p><p>{a.reason}</p>
    <p>Coach: {a.payload.coach_id ? actorName(data,a.payload.coach_id) : "Por acordar"} · Reunión: {a.payload.meeting_day || "Por acordar"} · Próxima revisión: {a.payload.next_review ?? "Por acordar"} · {a.payload.review_frequency || "Periodicidad por acordar"}.</p>
    {catalog.areas.map(ar => <details key={ar.key}><summary>{ar.key}. {ar.title}</summary>{ar.items.map(i => <div className="pa-item" key={i.id}><strong>{i.text}</strong><p>{personalResponseLabel(a.payload.answers[i.id]?.value)}</p><p>{a.payload.answers[i.id]?.context || "Sin ejemplo registrado"}</p>{a.payload.answers[i.id]?.missing_reason && <p>Información faltante: {a.payload.answers[i.id].missing_reason}</p>}</div>)}</details>)}
    {catalog.questions.filter(q => q.section !== "learning").map(q => <p key={q.id}><strong>{q.text}</strong><br/>{a.payload.open_answers[q.id] || "Sin responder"}</p>)}<p>Observaciones adicionales del paciente: {a.payload.additional_notes || "Sin observaciones"}.</p>
  </details>;
}
export function PersonalMatrix({catalog, assessments, href}: {catalog: PersonalCatalog; assessments: PersonalAssessment[]; href: (a: PersonalAssessment) => string}) {
  // Keep one submitted revision per assessment; old revisions stay in the source history below.
  const submitted = assessments.filter(a => a.status === "submitted" && a.catalog_id === catalog.id).filter((a,_,all) => !all.some(b => b.id === a.id && b.revision > a.revision)).sort((a,b) => a.payload.evaluation_date.localeCompare(b.payload.evaluation_date));
  if (!submitted.length) return <p>La comparación estará disponible cuando exista una evaluación enviada. Los borradores no se grafican.</p>;
  return <><p>Comparación por ítem · {catalog.document_version}. Cada columna conserva el autorreporte individual. Los puntos muestran la posición ordinal 0–4; G–H conserva texto. Sin información se indica expresamente.</p><div className="pa-table-wrap" tabIndex={0} role="region" aria-label="Matriz accesible por área e ítem"><table className="pa-matrix"><caption>Respuestas individuales de la misma versión del instrumento</caption><thead><tr><th scope="col">Área e ítem</th>{submitted.map(a => <th scope="col" key={a.id}><Link href={href(a)} prefetch={false}>{a.payload.evaluation_date}<br/>{a.baseline_id ? "Reevaluación" : "Inicial"} · r{a.revision}</Link></th>)}</tr></thead><tbody>{catalog.areas.flatMap(ar => ar.items.map(i => <tr key={i.id}><th scope="row">{ar.key}. {ar.title}<br/>{i.text}</th>{submitted.map(a => {const value = a.payload.answers[i.id]?.value; return <td key={a.id} data-missing={value == null}><Link href={href(a)} prefetch={false}>{typeof value === "number" && <span className="pa-dots" aria-hidden="true">{[0,1,2,3,4].map(n => <span key={n} data-selected={n === value}/>)}</span>}{personalResponseLabel(value)}</Link></td>;})}</tr>))}</tbody></table></div></>;
}
export async function PersonalAutonomyPage({pid, query}: {pid?: string; query: Query}) {
  for (const value of [query.evaluacion,query.inicial,query.version]) if (value && !z.uuid().safeParse(value).success) notFound();
  if (query.revision && !/^[1-9]\d*$/.test(query.revision)) notFound();
  const {patient, data} = await personalAutonomyContext(pid);
  const base = pid ? `/admin/seguimiento/pacientes/${pid}/recovery/autonomia-personal` : "/pacientes/autonomia";
  const action = personalAutonomyAction.bind(null,pid ?? null);
  const selected = query.evaluacion ? data.assessments.find(a => a.id === query.evaluacion && (!query.revision || a.revision === Number(query.revision))) : undefined;
  if (query.evaluacion && !selected) notFound();
  const baseline = query.inicial ? data.assessments.find(a => a.id === query.inicial && a.baseline_id === null && a.status === "submitted") : undefined;
  if (query.inicial && !baseline) notFound();
  const current = selected ?? (query.inicial || query.version ? undefined : data.assessments.find(a => !data.assessments.some(b => b.id === a.id && b.revision > a.revision)));
  const catalog = data.catalogs.find(c => c.id === (current?.catalog_id ?? baseline?.catalog_id ?? query.version)) ?? data.catalogs.at(-1);
  if (!catalog) notFound();
  const editable = !current || current.status === "draft" || query.editar === "1";
  const latest = current && !data.assessments.some(a => a.id === current.id && a.revision > current.revision);
  const published = current?.status === "submitted" ? current : data.assessments.find(a => a.status === "submitted" && a.catalog_id === catalog.id);
  const sourceHref = (a: PersonalAssessment) => `${base}?evaluacion=${a.id}&revision=${a.revision}#${sourceId(a)}`;
  const patientActor = data.actors.find(a => a.id === data.patient_actor_id);
  const ownAccepted = (p: PersonalContext["proposals"][number]) => data.patient_mode ? Boolean(p.patient_accepted_by) : Boolean(p.coach_accepted_by);
  const currentAgreements = personalAgreementSignature(data.proposals);
  return <div className={`pa-workspace${pid ? "" : " care-patient-workspace"}`}>
    <PageHeader eyebrow={pid ? `Recovery · ${patient.display_name}` : "Mi espacio"} title="Autonomía y mis acuerdos" description="Mis respuestas sobre la vida cotidiana, los apoyos que necesito y los pasos que acordamos."/>
    <nav className="care-nav" aria-label="Autonomía personal"><a href="#pa-evaluacion">Evaluación</a><a href="#pa-acuerdos">Acuerdos y revisiones</a><a href="#pa-evolucion">Evolución</a><a href="#pa-historial">Historial y fuentes</a>{pid && <Link href={`/admin/seguimiento/pacientes/${pid}/recovery`} prefetch={false}>Volver a Recovery</Link>}</nav>
    <p className="care-subtle">Instrumento de autorreporte · versión {catalog.document_version}. La transcripción fue cotejada con las cinco páginas. No acredita aprobación institucional ni validación diagnóstica. No modifica tratamientos ni semáforos.</p>
    <section id="pa-evaluacion"><AdminPanel title={current ? `Evaluación del ${current.payload.evaluation_date} · revisión ${current.revision}` : baseline ? "Nueva reevaluación" : "Evaluación inicial"}>
      {data.can_write && editable && (!current || latest) ? <PersonalWizard key={`${current?.id ?? "new"}-${current?.revision ?? 0}-${baseline?.id ?? ""}`} action={action} catalog={catalog} assessment={current} baseline={baseline?.id} actorId={data.actor_id} patientMode={data.patient_mode} coaches={data.actors.filter(a => data.coach_ids.includes(a.id))} initialDate={careLocalInput().slice(0,10)}/> : current ? <><AssessmentSource a={current} catalog={catalog} data={data}/><p>Próxima revisión: {current.payload.next_review ?? "Por acordar"}.</p>{data.can_write && latest && <Link className="admin-button admin-button-secondary" href={`${base}?evaluacion=${current.id}&editar=1`} prefetch={false}>Corregir respuestas conservando el historial</Link>}</> : <p>Sin evaluación registrada.</p>}
      {data.can_write && published && <p><Link href={`${base}?inicial=${published.baseline_id ?? published.id}`} prefetch={false}>Crear reevaluación vinculada a la inicial · misma versión</Link></p>}
    </AdminPanel></section>
    <section id="pa-acuerdos"><AdminPanel title="Mis acuerdos y próxima revisión">
      <p>Las propuestas del paciente y del coach conservan su origen. El compromiso se vincula al plan después de ambas aceptaciones. Los resultados de revisión se guardan por separado del estado de la tarea.</p>
      {published && data.can_write && <details><summary>Proponer un compromiso</summary><ProposalForm key={`${published.id}-${published.revision}`} action={action} assessment={published} catalog={catalog} actors={data.actors.filter(a => a.id !== patientActor?.id)}/></details>}
      {!data.proposals.length && <p>Aún no hay propuestas. La evaluación no genera obligaciones automáticamente.</p>}
      {data.proposals.map(p => {const source = data.assessments.find(a => a.id === p.assessment_id && a.revision === p.assessment_revision), pc = data.catalogs.find(c => c.id === source?.catalog_id) ?? catalog, reviews = data.reviews.filter(r => r.proposal_id === p.id);return <article key={p.id} className="pa-agreement" id={`acuerdo-${p.id}`}><h3>{p.description}</h3><p>Propuesta del {p.origin === "patient" ? "paciente" : "coach"} · {actorName(data,p.proposed_by)} · {careTimestamp(p.created_at)} · área {p.area}{p.item_id && ` / ${p.item_id}`}.</p><p>Responsable: {p.responsible_kind === "patient" ? patient.display_name : actorName(data,p.responsible_id!)}. Plazo: {careTimestamp(p.due_at)}{p.frequency && ` · Frecuencia: ${p.frequency}`}. Próxima revisión: {careTimestamp(p.review_at)}.</p><p>Verificación prevista: {p.verification}</p><p>Dificultad anticipada: {p.difficulty || "Sin registrar"}. Si aparece: {p.contingency || "Por acordar"}.</p><p>Paciente: {p.patient_accepted_by ? "aceptó" : "pendiente de aceptar"} · Coach: {p.coach_accepted_by ? "aceptó" : "pendiente de aceptar"}.</p>
        {p.commitment_id ? <p><Link prefetch={false} href={pid ? `/admin/seguimiento/pacientes/${pid}/planificacion#compromiso-${p.commitment_id}` : `/pacientes/compromisos#compromiso-${p.commitment_id}`}>Ver compromiso en el plan</Link> · identificador {p.commitment_id}.</p> : data.can_write && !ownAccepted(p) && <AcceptProposal action={action} proposal={p}/>}
        {source && <Link href={sourceHref(source)} prefetch={false}>Ver evaluación de origen · r{source.revision}</Link>}
        {p.commitment_id && data.can_write && <details><summary>Registrar seguimiento y aprendizaje</summary><ReviewForm action={action} proposal={p} catalog={pc}/></details>}
        {reviews.map(r => <details key={r.id} id={`revision-${r.id}`} className="pa-source"><summary>{r.review_date} · {r.outcome}{reviews.some(n => n.supersedes === r.id) ? " · corregida; original conservado" : ""}</summary><p>{r.period_start} a {r.period_end} · {actorName(data,r.actor_id)} · {careTimestamp(r.recorded_at)} · {r.actor_kind === "patient" ? "Autorreporte / relato" : "Registro del equipo; evidencia declarada"}.</p><p>Resultado: {r.result}</p><p>Evidencia o ejemplo: {r.evidence}</p><p>Apoyo: {r.support || "Sin registrar"}</p><p>Próximo paso: {r.next_step}</p>{pc.questions.filter(q => q.section === "learning").map(q => <p key={q.id}><strong>{q.text}</strong><br/>{r.learning[q.id] || "Sin respuesta registrada"}</p>)}<p>Motivo: {r.reason}</p>{r.supersedes && <p>Corrige revisión {r.supersedes}; el original se conserva.</p>}{data.can_write && r.actor_id === data.actor_id && !reviews.some(n => n.supersedes === r.id) && <details><summary>Corregir esta revisión</summary><ReviewForm action={action} proposal={p} catalog={pc} supersedes={r.id}/></details>}</details>)}
      </article>;})}
    </AdminPanel></section>
    {published && <AdminPanel title={`Cierre y constancia de conversación · evaluación r${published.revision}`}>
      {data.can_write && <ClosingForm key={`${published.id}-${published.revision}`} action={action} assessment={published} catalog={catalog}/>}
      <p>La ausencia de constancia significa conversación pendiente. Cada persona registra la suya. Una corrección de respuestas requiere conversar la nueva versión.</p>
      {data.attestations.filter(t => t.assessment_id === published.id && t.revision === published.revision).map(t => <div key={t.id}><p><strong>{t.party === "patient" ? "Paciente" : "Coach"}: {actorName(data,t.actor_id)}</strong> · {t.state === "pending" ? "Pendiente de conversación" : t.state === "differences" ? "Conversado con diferencias" : "Contenido y acuerdos conversados"} · {careTimestamp(t.recorded_at)}<br/>{t.note}</p><p>Esta constancia conserva {t.agreement_snapshot.length} propuestas/acuerdos de ese momento.</p>{personalAgreementSignature(t.agreement_snapshot) !== currentAgreements && <p>Los acuerdos cambiaron después de esta constancia. Los cambios están pendientes de conversación.</p>}</div>)}
      {!data.patient_mode && data.can_write && <details><summary>Añadir observación profesional separada</summary><ObservationForm key={`${published.id}-${published.revision}`} action={action} assessment={published}/></details>}
    </AdminPanel>}
    <section id="pa-evolucion"><AdminPanel title="Respuestas individuales y evolución"><details><summary>Comparar ítems · matriz y tabla accesible</summary><PersonalMatrix catalog={catalog} assessments={data.assessments} href={sourceHref}/></details><h3>Resultados de los compromisos</h3><p>Cada resultado cuenta una revisión vigente. Correcciones anteriores se conservan en las fuentes. Los avances parciales y las pausas tienen categorías propias.</p>{(["patient","coach"] as const).map(kind => <section key={kind} aria-label={kind === "patient" ? "Resultados relatados por paciente" : "Resultados registrados por coach"}><h3>{kind === "patient" ? "Revisiones del paciente · autorreporte" : "Revisiones del coach · registro del equipo"}</h3>{personalOutcomes.map(outcome => {const rows = data.reviews.filter(r => r.actor_kind === kind && r.outcome === outcome && !data.reviews.some(n => n.supersedes === r.id)); return <div key={outcome} className="pa-result"><strong>{outcome}: {rows.length}</strong><span className="pa-result-bar" style={{width: `${Math.min(rows.length * 24,240)}px`}} aria-hidden="true"/>{rows.map(r => <a key={r.id} href={`#revision-${r.id}`}>{r.review_date} · abrir evidencia</a>)}</div>;})}</section>)}</AdminPanel></section>
    <section id="pa-historial"><AdminPanel title="Historial y fuentes"><p>Se conservan evaluación inicial, reevaluaciones, borradores y correcciones. Selecciona una versión para leerla.</p>{data.catalogs.length > 1 && <nav className="care-nav" aria-label="Versiones del instrumento">{data.catalogs.map(c => <Link key={c.id} href={`${base}?version=${c.id}`} prefetch={false}>{c.document_version}</Link>)}</nav>}
      {data.assessments.map(a => <p key={`${a.id}-${a.revision}`}><Link href={sourceHref(a)} prefetch={false}>{a.payload.evaluation_date} · revisión {a.revision} · {a.status === "draft" ? "Borrador" : "Enviada"} · {data.catalogs.find(c => c.id === a.catalog_id)?.document_version}</Link></p>)}
      <details><summary>Constancias anteriores, con su versión conversada</summary>{data.attestations.map(t => <p key={t.id}>Evaluación {t.assessment_id} · r{t.revision} · {actorName(data,t.actor_id)} · {t.state} · {careTimestamp(t.recorded_at)}<br/>{t.note}</p>)}</details>
      {data.observations.map(o => <article className="pa-item" key={o.id}><strong>Observación profesional · {o.shared ? "Compartida" : "Reservada"}</strong><p>{actorName(data,o.actor_id)} · {careTimestamp(o.recorded_at)} · evaluación {o.assessment_id} r{o.revision}</p><p>{o.body}</p></article>)}
      <p className="care-subtle">Las fotografías de origen se conservan en el repositorio privado. No se publican en la web.</p>
    </AdminPanel></section>
  </div>;
}
