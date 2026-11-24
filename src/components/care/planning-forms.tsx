import { randomUUID } from "node:crypto";
import { CareField, CareForm, type CareFormState } from "./care-form";
import { careLocalInput } from "@/lib/care/time";
import { attendanceLabels, eventKindLabels } from "@/lib/care/planning";
import type { CareCommitment, CareEvent, CareIdentity, CareParticipant, CarePlan } from "@/types/care";
import { ParticipantPicker } from "./participant-picker";
type Action=(_:CareFormState,data:FormData)=>Promise<CareFormState>;
const Hidden=({name,value}:{name:string;value:string|number})=><input name={name} value={value} type="hidden"/>;
export function EventForm({action,patients,event,participantIds=[],total}:{action:Action;patients:CareIdentity[];event?:CareEvent;participantIds?:string[];total?:number}) {
  const id=event?.id??randomUUID();
  return <CareForm action={action} label={event?"Guardar reprogramación":"Programar actividad"}><Hidden name="op" value="event"/><Hidden name="id" value={id}/><Hidden name="version" value={event?.version??0}/>
    <div key={`${id}-${event?.version??0}`} className="care-form-fields">
    <CareField name="title" label="Actividad"><input required minLength={3} maxLength={120} defaultValue={event?.title}/></CareField>
    <CareField name="kind" label="Tipo de actividad"><select required defaultValue={event?.kind??""}><option value="" disabled>Selecciona un tipo</option>{Object.entries(eventKindLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></CareField>
    <div className="care-grid"><CareField name="starts_at" label="Inicio (hora de Chile)"><input required type="datetime-local" defaultValue={event?careLocalInput(event.starts_at):careLocalInput()}/></CareField><CareField name="ends_at" label="Término (hora de Chile)"><input required type="datetime-local" defaultValue={event?careLocalInput(event.ends_at):""}/></CareField></div>
    <CareField name="modality" label="Modalidad"><select required defaultValue={event?.modality??"in_person"}><option value="in_person">Presencial</option><option value="remote">Remota</option></select></CareField>
    <CareField name="location" label="Lugar o indicación de acceso"><input maxLength={160} defaultValue={event?.location}/></CareField>
    {event?<><Hidden name="weeks" value={1}/>{participantIds.map(pid=><Hidden key={pid} name="patients" value={pid}/>)}</>:<>
      <CareField name="weeks" label="Repetición semanal"><select defaultValue="1">{[1,2,4,8,12].map(n=><option value={n} key={n}>{n===1?"Una actividad":`${n} semanas, misma hora de Chile`}</option>)}</select></CareField>
      <ParticipantPicker initial={patients} selectedIds={participantIds} initialTotal={total}/>
    </>}
    {event?<CareField name="reason" label="Motivo compartido de reprogramación"><input required minLength={3} maxLength={300}/></CareField>:<Hidden name="reason" value="Programación"/>}
    </div>
  </CareForm>;
}
export function AttendanceForm({action,participant}:{action:Action;participant:CareParticipant}) {
  return <CareForm action={action} label="Guardar asistencia"><Hidden name="op" value="attendance"/><Hidden name="id" value={participant.event_id}/><Hidden name="patient_id" value={participant.patient_id}/><Hidden name="version" value={participant.version}/>
    <CareField name="attendance" label="Asistencia"><select defaultValue={participant.attendance} key={participant.version}>{Object.entries(attendanceLabels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></CareField>
    <details><summary>Puntualidad y participación observadas (opcional)</summary><CareField name="punctuality" label="Puntualidad observada"><select defaultValue={participant.punctuality??""}><option value="">Sin observación</option><option value="on_time">En horario</option><option value="late">Llegada tardía</option></select></CareField><CareField name="participation" label="Hecho observado compartido"><input maxLength={150} defaultValue={participant.participation}/></CareField><p className="care-subtle">Completa estos campos solo si registras asistencia presente y lo observaste.</p></details>
    <CareField name="reason" label="Motivo compartido del registro o corrección"><input required minLength={3} maxLength={300} defaultValue={participant.attendance==="pending"?"Registro de asistencia":""}/></CareField>
  </CareForm>;
}
export function PlanForm({action,plan}:{action:Action;plan?:CarePlan}) {
  const id=plan?.id??randomUUID();
  return <CareForm action={action} label={plan?"Guardar cambio de plan":"Añadir a mi semana"}><Hidden name="op" value="plan"/><Hidden name="id" value={id}/><Hidden name="version" value={plan?.version??0}/>
    <div className="care-form-fields" key={`${id}-${plan?.version??0}`}><CareField name="title" label="Qué voy a hacer"><input required minLength={3} maxLength={160} defaultValue={plan?.title}/></CareField>
    <CareField name="planned_for" label="Cuándo (hora de Chile)"><input required type="datetime-local" defaultValue={plan?careLocalInput(plan.planned_for):careLocalInput()}/></CareField>
    {plan?<><CareField name="status" label="Estado del plan"><select defaultValue="planned"><option value="planned">Planificada</option><option value="cancelled">Cancelar</option></select></CareField><CareField name="reason" label="Motivo del cambio"><input required minLength={3} maxLength={300}/></CareField></>:<><Hidden name="status" value="planned"/><Hidden name="reason" value="Plan personal"/></>}</div>
  </CareForm>;
}
export function CompletePlanForm({action,plan}:{action:Action;plan:CarePlan}){return <CareForm action={action} label="Marcar realizada"><Hidden name="op" value="plan_complete"/><Hidden name="id" value={plan.id}/><Hidden name="version" value={plan.version}/></CareForm>;}
export function CommitmentForm({action,pid,patientMode=false,commitment,eventId="",responsibles=[]}:{action:Action;pid:string;patientMode?:boolean;commitment?:CareCommitment;eventId?:string;responsibles?:{user_id:string;label:string}[]}) {
  const id=commitment?.id??randomUUID();
  return <CareForm action={action} label={commitment?"Guardar cambio de compromiso":patientMode?"Guardar mi compromiso":"Guardar compromiso"}><Hidden name="op" value="commitment"/><Hidden name="id" value={id}/><Hidden name="version" value={commitment?.version??0}/><Hidden name="patient_id" value={pid}/><Hidden name="source_event_id" value={commitment?.source_event_id??eventId}/>
    <div key={`${id}-${commitment?.version??0}`} className="care-form-fields"><CareField name="title" label="Compromiso concreto"><input required minLength={3} maxLength={160} defaultValue={commitment?.title}/></CareField><CareField name="due_at" label="Fecha prevista (hora de Chile)"><input required type="datetime-local" defaultValue={commitment?careLocalInput(commitment.due_at):careLocalInput()}/></CareField>
    {patientMode?<><Hidden name="visibility" value="patient"/><Hidden name="responsible_id" value=""/></>:<><CareField name="visibility" label="Visibilidad del compromiso"><select defaultValue={commitment?.visibility??"coordination"}><option value="coordination">Solo coordinación del equipo</option><option value="patient">Compartido con el paciente</option></select></CareField><label className="care-check"><input type="checkbox" name="confirm_publish"/>Confirmo compartir este compromiso y su motivo con el paciente si seleccioné esa visibilidad.</label>{commitment?<Hidden name="responsible_id" value={commitment.responsible_id??""}/>:<CareField name="responsible_id" label="Responsable de realizarlo"><select defaultValue=""><option value="">Paciente</option>{responsibles.map(r=><option value={r.user_id} key={r.user_id}>{r.label}</option>)}</select></CareField>}</>}
    {commitment?<CareField name="status" label="Estado del compromiso"><select defaultValue="pending"><option value="pending">Pendiente</option><option value="cancelled">Cancelar</option></select></CareField>:<Hidden name="status" value="pending"/>}
    {patientMode&&!commitment?<Hidden name="reason" value="Compromiso personal"/>:<CareField name="reason" label="Motivo compartido del acuerdo o cambio"><input required minLength={3} maxLength={300}/></CareField>}</div>
  </CareForm>;
}
export function CompleteCommitmentForm({action,commitment,verify=false}:{action:Action;commitment:CareCommitment;verify?:boolean}){return <CareForm action={action} label={verify?"Verificar realización":"Marcar realizado"}><Hidden name="op" value={verify?"commitment_verify":"commitment_complete"}/><Hidden name="id" value={commitment.id}/><Hidden name="version" value={commitment.version}/><CareField name="result" label={verify?"Resultado verificado compartido":"Cómo resultó"}><input required minLength={3} maxLength={300}/></CareField><Hidden name="reason" value={verify?"Verificación profesional":"Confirmación de realización"}/></CareForm>;}
