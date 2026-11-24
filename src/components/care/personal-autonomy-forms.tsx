"use client";
import { cloneElement, useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CareFormState } from "./care-form";
import { personalCategories, personalOutcomes, personalResponseLabel, personalScale, personalSectionProgress, type PersonalAssessment, type PersonalCatalog, type PersonalContext, type PersonalPayload, type PersonalProposal } from "@/lib/care/personal-autonomy";
import { careLocalToUtc } from "@/lib/care/time";
type Action = (state: CareFormState, form: FormData) => Promise<CareFormState>;
type DataFormProps = {action: Action; op: string; base: Record<string, unknown>; prepare?: (form: FormData) => Record<string, unknown>; children?: React.ReactNode; label: string};

function DataForm(props: DataFormProps) {
  const [generation, setGeneration] = useState(0);
  return <DataFormInner key={generation} {...props} restart={() => setGeneration(n => n + 1)}/>;
}
function DataFormInner({action, op, base, prepare, children, label, restart}: DataFormProps & {restart: () => void}) {
  const router = useRouter(), operation = useRef<string | null>(null), formRef = useRef<HTMLFormElement>(null);
  const [state, send, pending] = useActionState(async (previous: CareFormState, form: FormData) => {
    operation.current ??= crypto.randomUUID();
    try {
      const request = new FormData(); request.set("op", op);
      request.set("data", JSON.stringify({id: operation.current, ...base, ...prepare?.(form)}));
      return await action(previous, request);
    } catch { return {status: "error" as const, message: "Revisa las fechas y los campos. No se confirmó el guardado; tus cambios siguen en pantalla."}; }
  }, {status: "idle"});
  useEffect(() => { if (state.status === "success") { router.refresh(); } }, [state, router]);
  return <form ref={formRef} action={send} className="care-form pa-form" aria-busy={pending} onReset={e => e.preventDefault()}>
    <fieldset disabled={pending || state.status === "success"}>{children}<button className="admin-button admin-button-primary" type="submit">{pending ? "Guardando…" : state.status === "success" ? "Guardado" : label}</button></fieldset>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "admin-form-error" : "admin-notice"}>{state.message}</p>}
    {state.status === "success" && op !== "accept" && <button type="button" className="admin-button admin-button-secondary" onClick={restart}>Nuevo registro</button>}
  </form>;
}
function Field({label, name, children}: {label: string; name: string; children?: React.ReactElement<{id?: string; name?: string}>}) {
  const id = useId();
  return <div className="care-field"><label htmlFor={id}>{label}</label>{children ? cloneElement(children,{id,name}) : <textarea id={id} name={name} maxLength={2000} rows={3}/>}</div>;
}
const formText = (f: FormData, k: string) => String(f.get(k) ?? "");

export function PersonalWizard({action, catalog, assessment, baseline, actorId, patientMode, coaches, initialDate}: {action: Action; catalog: PersonalCatalog; assessment?: PersonalAssessment; baseline?: string; actorId: string; patientMode: boolean; coaches: {id: string; label: string}[]; initialDate: string}) {
  const router = useRouter(), requestId = useRef<string | null>(assessment?.id ?? null), dirty = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0), [payload, setPayload] = useState<PersonalPayload>(assessment?.payload ?? {evaluation_date: initialDate, coach_id: null, meeting_day: "", review_frequency: "", next_review: null, answers: {}, open_answers: {}, additional_notes: ""});
  const [present, setPresent] = useState(false), [confirmed, setConfirmed] = useState(false), [reason, setReason] = useState(assessment ? "Corrección de mis respuestas" : "Evaluación inicial"), [saveKind, setSaveKind] = useState("draft");
  const [state, send, pending] = useActionState(async (previous: CareFormState, form: FormData) => {
    requestId.current ??= crypto.randomUUID();
    const op = formText(form, "op"); setSaveKind(op);
    const request = new FormData(); request.set("op", op);
    request.set("data", JSON.stringify({id: requestId.current, catalog_id: catalog.id, version: assessment?.revision ?? 0, baseline_id: assessment?.baseline_id ?? baseline ?? null, mode: patientMode ? "self" : "assisted", patient_present: present, reason, confirm: confirmed, payload}));
    try { const result = await action(previous, request); if (result.status === "success") dirty.current = false; return result; } catch { return {status: "error" as const, message: "No se confirmó el guardado. Tus respuestas siguen en pantalla."}; }
  }, {status: "idle"});
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {if (dirty.current) e.preventDefault();};
    const links = (e: MouseEvent) => {const a = (e.target as Element).closest("a[href]"); if (dirty.current && a && !a.getAttribute("href")?.startsWith("#") && !window.confirm("Tienes respuestas sin guardar. ¿Salir de esta pantalla?")) {e.preventDefault(); e.stopPropagation();}};
    window.addEventListener("beforeunload", guard); document.addEventListener("click", links, true);
    return () => {window.removeEventListener("beforeunload", guard); document.removeEventListener("click", links, true);};
  }, []);
  function move(n: number) {setStep(n); requestAnimationFrame(() => heading.current?.focus());}
  function update(patch: Partial<PersonalPayload>) {dirty.current = true; setPayload(p => ({...p, ...patch}));}
  const steps = ["Identificación", ...catalog.areas.map(a => `${a.key}. ${a.title}`), "Mi situación actual", "Confianza y acuerdos", "Resumen y envío"];
  const area = catalog.areas[step - 1], progress = personalSectionProgress(payload, catalog);
  if (state.status === "success") return <section className="care-card pa-success" role="status"><h2>{saveKind === "draft" ? "Tu borrador está guardado" : "Tu evaluación fue enviada"}</h2><p>{state.message}</p><p>Próxima revisión: {payload.next_review ?? "Por acordar"}. Periodicidad: {payload.review_frequency || "Por acordar"}.</p><p>Los acuerdos se proponen y aceptan por separado. Puedes verlos debajo.</p><button type="button" className="admin-button admin-button-secondary" onClick={() => router.refresh()}>Continuar con mis respuestas y acuerdos</button></section>;
  return <form action={send} className="care-form pa-wizard" aria-busy={pending} onReset={e => e.preventDefault()} onChange={() => {dirty.current = true;}}>
    <p className="care-subtle">{progress.answered} de 8 áreas con todos sus ítems respondidos. Este indicador muestra llenado del formulario.</p>
    <progress value={progress.answered} max={8} aria-label="Áreas respondidas"/>
    <label className="care-field">Ir a una sección<select value={step} onChange={e => move(Number(e.target.value))}>{steps.map((s, n) => <option value={n} key={s}>{n + 1}. {s}</option>)}</select></label>
    <h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
    <fieldset disabled={pending}>
      {step === 0 && <><p className="care-note">{catalog.instructions}</p><p>Responde desde tu situación actual. Tus respuestas son un autorreporte. Puedes guardar y continuar otro día.</p>
        <Field name="evaluation_date" label={assessment?.baseline_id || baseline ? "Fecha de reevaluación" : "Fecha de evaluación inicial"}><input type="date" value={payload.evaluation_date} onChange={e => update({evaluation_date: e.target.value})}/></Field>
        <Field name="coach_id" label="Coach"><select value={payload.coach_id ?? ""} onChange={e => update({coach_id: e.target.value || null})}><option value="">Seleccionar coach</option>{coaches.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
        <Field name="meeting_day" label="Día de reunión"><input value={payload.meeting_day} maxLength={80} onChange={e => update({meeting_day: e.target.value})} placeholder="Por ejemplo, martes"/></Field>
        <Field name="review_frequency" label="Periodicidad de revisión acordada"><input value={payload.review_frequency} maxLength={120} onChange={e => update({review_frequency: e.target.value})} placeholder="Por ejemplo, cada dos semanas"/></Field>
        <Field name="next_review" label="Próxima revisión"><input type="date" value={payload.next_review ?? ""} onChange={e => update({next_review: e.target.value || null})}/></Field>
        {!patientMode && <label className="care-check"><input type="checkbox" checked={present} onChange={e => setPresent(e.target.checked)}/> El paciente responde y está presente; yo solo registro su respuesta. Mis observaciones irán por separado.</label>}
        <p className="care-subtle">Carga: {patientMode ? "paciente" : "asistida por coach"} · usuario {actorId}. La identidad del paciente se obtiene de la ficha autorizada.</p></>}
      {area && <><details><summary>Ver escala e instrucciones</summary>{area.key <= "F" ? catalog.scale_descriptions.map(s => <p key={s.value}><strong>{s.value} · {personalScale[s.value]}</strong>: {s.description}</p>) : <p>Responde Sí, No o A veces. Estas opciones se conservan como texto.</p>}</details>
        {area.items.map(item => {const answer = payload.answers[item.id] ?? {value: null, context: "", missing_reason: ""}; const setAnswer = (patch: Partial<typeof answer>) => update({answers: {...payload.answers, [item.id]: {...answer, ...patch}}});
          return <section key={item.id} className="pa-item"><h3>{item.text}</h3>
            <Field name={item.id} label={`Respuesta ${item.id}`}><select value={answer.value ?? ""} onChange={e => setAnswer({value: e.target.value === "" ? null : area.key <= "F" ? Number(e.target.value) : e.target.value as typeof personalCategories[number], missing_reason: ""})}><option value="">Sin responder / sin información</option>{area.key <= "F" ? personalScale.map((s, n) => <option value={n} key={n}>{n} · {s}</option>) : personalCategories.map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field name={`${item.id}_context`} label="Ejemplo, dificultad o apoyo actual"><textarea value={answer.context} maxLength={2000} rows={2} onChange={e => setAnswer({context: e.target.value})}/></Field>
            {answer.value === null && <Field name={`${item.id}_missing`} label="Si falta información, indica el motivo"><textarea value={answer.missing_reason} maxLength={2000} rows={2} onChange={e => setAnswer({missing_reason: e.target.value})}/></Field>}
          </section>;
        })}</>}
      {(step === 9 || step === 10) && <>{step === 10 && <p>Completa esta sección desde tu propia percepción.</p>}{catalog.questions.filter(q => q.section === (step === 9 ? "initial" : "perspective")).map(q => <Field key={q.id} name={q.id} label={q.text}><textarea rows={3} maxLength={2000} value={payload.open_answers[q.id] ?? ""} onChange={e => update({open_answers: {...payload.open_answers, [q.id]: e.target.value}})}/></Field>)}</>}
      {step === 11 && <><p>Revisa tus respuestas antes de enviarlas. Puedes volver a cualquier sección.</p>{catalog.areas.map(a => <details key={a.key}><summary>{a.key}. {a.title}</summary>{a.items.map(i => <p key={i.id}><strong>{i.text}</strong><br/>{personalResponseLabel(payload.answers[i.id]?.value)}<br/>{payload.answers[i.id]?.context}{payload.answers[i.id]?.missing_reason && ` · Motivo: ${payload.answers[i.id].missing_reason}`}</p>)}</details>)}
        {catalog.questions.filter(q => q.section !== "learning").map(q => <p key={q.id}><strong>{q.text}</strong><br/>{payload.open_answers[q.id] || "Sin responder"}</p>)}
        <Field name="notes" label="Observaciones adicionales del paciente"><textarea value={payload.additional_notes} maxLength={2000} rows={3} onChange={e => update({additional_notes: e.target.value})}/></Field>
        <Field name="reason" label="Motivo del registro o corrección"><input value={reason} maxLength={300} onChange={e => setReason(e.target.value)}/></Field>
        <label className="care-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/> Revisé mis respuestas y quiero enviar esta versión.</label>
        <button type="submit" name="op" value="submit" disabled={!confirmed || (!patientMode && !present)} className="admin-button admin-button-primary">Enviar evaluación</button></>}
      <nav className="pa-step-controls" aria-label="Pasos de la evaluación">{step > 0 && <button className="admin-button admin-button-secondary" type="button" onClick={() => move(step - 1)}>Anterior</button>}{step < 11 && <button className="admin-button admin-button-secondary" type="button" onClick={() => move(step + 1)}>Siguiente</button>}<button className="admin-button admin-button-secondary" name="op" value="draft" type="submit" disabled={!patientMode && !present}>{pending ? "Guardando…" : "Guardar borrador"}</button></nav>
    </fieldset>{state.message && <p role="alert" className="admin-form-error">{state.message}</p>}
  </form>;
}

export function ProposalForm({action, assessment, catalog, actors}: {action: Action; assessment: PersonalAssessment; catalog: PersonalCatalog; actors: PersonalContext["actors"]}) {
  const [area, setArea] = useState("A"), [kind, setKind] = useState("patient");
  return <DataForm action={action} op="propose" base={{assessment_id: assessment.id, assessment_revision: assessment.revision}} label="Guardar propuesta, pendiente de acuerdo" prepare={f => ({area, item_id: formText(f,"item_id"), description: formText(f,"description"), responsible_kind: kind, responsible_id: kind === "patient" ? null : formText(f,"responsible_id") || null, due_at: formText(f,"due_at") ? careLocalToUtc(formText(f,"due_at")) : null, frequency: formText(f,"frequency"), review_at: careLocalToUtc(formText(f,"review_at")), verification: formText(f,"verification"), difficulty: formText(f,"difficulty"), contingency: formText(f,"contingency"), existing_commitment_id: formText(f,"existing_commitment_id") || null})}>
    <p>{catalog.agreement_instructions} El origen se registra con tu identidad. Ninguna propuesta queda aceptada automáticamente.</p>
    <Field name="description" label="Compromiso propuesto"><input name="description" required minLength={3} maxLength={160}/></Field>
    <Field name="area" label="Área trabajada"><select value={area} onChange={e => setArea(e.target.value)}>{catalog.areas.map(a => <option key={a.key} value={a.key}>{a.key}. {a.title}</option>)}</select></Field>
    <Field name="item_id" label="Ítem (opcional)"><select key={area} name="item_id"><option value="">Área completa</option>{catalog.areas.find(a => a.key === area)?.items.map(i => <option key={i.id} value={i.id}>{i.text}</option>)}</select></Field>
    <Field name="responsible_kind" label="Responsable"><select value={kind} onChange={e => setKind(e.target.value)}><option value="patient">Paciente</option><option value="professional">Profesional</option></select></Field>
    {kind === "professional" && <Field name="responsible_id" label="Profesional responsable"><select name="responsible_id" required><option value="">Seleccionar</option>{actors.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></Field>}
    <Field name="due_at" label="Plazo para el compromiso (si corresponde)"><input name="due_at" type="datetime-local"/></Field>
    <Field name="frequency" label="Frecuencia, cuando corresponda"><input name="frequency" maxLength={120}/></Field>
    <Field name="review_at" label="Fecha de revisión"><input name="review_at" type="datetime-local" required/></Field>
    <Field name="verification" label="¿Cómo se verificará?"><textarea name="verification" required minLength={3} maxLength={600}/></Field>
    <Field name="difficulty" label="¿Qué podría dificultar el cumplimiento?"/>
    <Field name="contingency" label="¿Qué haremos si aparece esa dificultad?"/>
    <details><summary>Vincular un compromiso compartido ya existente</summary><p>Si esta tarea ya existe, introduce su identificador. Deben coincidir descripción, responsable y plazo para evitar duplicarla.</p><Field name="existing_commitment_id" label="Identificador del compromiso existente"><input name="existing_commitment_id"/></Field></details>
  </DataForm>;
}
export function AcceptProposal({action, proposal}: {action: Action; proposal: PersonalProposal}) {
  return <DataForm action={action} op="accept" base={{proposal_id: proposal.id}} prepare={f => ({confirm: f.get("confirm") === "on"})} label="Registrar mi aceptación"><label className="care-check"><input type="checkbox" name="confirm" required/> Acepto expresamente este compromiso con estos datos.</label></DataForm>;
}
export function ReviewForm({action, proposal, catalog, supersedes}: {action: Action; proposal: PersonalProposal; catalog: PersonalCatalog; supersedes?: string}) {
  return <DataForm key={supersedes ?? "new"} action={action} op="review" base={{proposal_id: proposal.id, supersedes: supersedes ?? null}} label={supersedes ? "Guardar corrección conservando el original" : "Guardar revisión"} prepare={f => ({review_date: formText(f,"review_date"), period_start: formText(f,"period_start"), period_end: formText(f,"period_end"), outcome: formText(f,"outcome"), result: formText(f,"result"), evidence: formText(f,"evidence"), support: formText(f,"support"), next_step: formText(f,"next_step"), learning: Object.fromEntries(catalog.questions.filter(q => q.section === "learning").map(q => [q.id,formText(f,q.id)])), shared: f.get("shared") === "on", reason: formText(f,"reason")})}>
    <p>{catalog.review_instructions}</p>
    <Field name="review_date" label="Fecha de revisión"><input name="review_date" type="date" required/></Field>
    <Field name="period_start" label="Inicio del periodo"><input name="period_start" type="date" required/></Field>
    <Field name="period_end" label="Fin del periodo (incluido)"><input name="period_end" type="date" required/></Field>
    <Field name="outcome" label="Resultado"><select name="outcome" required><option value="">Seleccionar</option>{personalOutcomes.map(o => <option key={o}>{o}</option>)}</select></Field>
    <details><summary>Criterios para registrar el resultado</summary>{personalOutcomes.map((o,n) => <p key={o}><strong>{o}</strong>: {catalog.outcome_criteria[n]}</p>)}</details>
    <Field name="result" label="Resultado concreto"><textarea name="result" required minLength={3} maxLength={2000}/></Field>
    <Field name="evidence" label="Evidencia o ejemplo concreto"><textarea name="evidence" required minLength={3} maxLength={2000}/></Field>
    <Field name="support" label="Apoyo necesario"/>
    <Field name="next_step" label="Próximo paso / ajuste"><textarea name="next_step" required minLength={3} maxLength={2000}/></Field>
    <details><summary>Revisión de avances y aprendizaje</summary>{catalog.questions.filter(q => q.section === "learning").map(q => <Field key={q.id} name={q.id} label={q.text}/>)}</details>
    <Field name="reason" label="Motivo del registro o corrección"><input name="reason" required minLength={3} maxLength={300}/></Field>
    <label className="care-check"><input name="shared" type="checkbox" defaultChecked required/> Compartir esta revisión con el paciente y equipo autorizado.</label>
  </DataForm>;
}
export function ClosingForm({action, assessment, catalog}: {action: Action; assessment: PersonalAssessment; catalog: PersonalCatalog}) {
  return <DataForm action={action} op="attest" base={{assessment_id: assessment.id, revision: assessment.revision}} prepare={f => ({state: formText(f,"state"), note: formText(f,"note"), confirm: f.get("confirm") === "on"})} label="Registrar mi constancia">
    <p>{catalog.closing_text}</p><p>Esta constancia registra tu identidad y fecha. No constituye firma electrónica certificada ni consentimiento general de tratamiento.</p>
    <Field name="state" label="Mi constancia para esta versión"><select name="state"><option value="pending">Pendiente de conversación</option><option value="discussed">Contenido y acuerdos conversados</option><option value="differences">Conversados con diferencias</option></select></Field>
    <Field name="note" label="Diferencias u observaciones"/>
    <label className="care-check"><input name="confirm" type="checkbox" required/> Registro mi propia constancia sobre esta versión.</label>
  </DataForm>;
}
export function ObservationForm({action, assessment}: {action: Action; assessment: PersonalAssessment}) {
  return <DataForm action={action} op="observe" base={{assessment_id: assessment.id, revision: assessment.revision}} prepare={f => ({body: formText(f,"body"), shared: f.get("shared") === "on"})} label="Guardar observación del coach">
    <Field name="body" label="Observación profesional separada del autorreporte"><textarea name="body" required minLength={3} maxLength={2000}/></Field><label className="care-check"><input name="shared" type="checkbox"/> Compartir con paciente y equipo autorizado (sin marcar: reservada al autor y Dirección).</label>
  </DataForm>;
}
