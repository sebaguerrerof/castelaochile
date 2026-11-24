"use client";
import { CareField } from "./care-form";
import { recoveryActivityLabels, recoveryParticipationLabels, recoverySupportLabels, recoveryEvidenceLabels } from "@/lib/care/recovery-coach";
import { careLocalInput } from "@/lib/care/time";

export function RecoveryActivityInputs({payload,change}:{payload:Record<string,string>;change:(key:string,value:string)=>void}) {
  const text=(key:string,label:string,help?:string)=><div><CareField name={key} label={label}><textarea rows={2} maxLength={600} aria-describedby={help?`recovery-${key}-help`:undefined} value={payload[key]??""} onChange={e=>change(key,e.target.value)}/></CareField>{help&&<p id={`recovery-${key}-help`} className="care-subtle">{help}</p>}</div>;
  const select=(key:string,label:string,options:Record<string,string>)=><CareField name={key} label={label}><select value={payload[key]??""} onChange={e=>change(key,e.target.value)}><option value="">Selecciona al finalizar</option>{Object.entries(options).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></CareField>;
  const date=(key:string,label:string)=>{const raw=payload[key]??"";return <CareField name={key} label={label}><input type="datetime-local" value={/[Zz]$|[+-]\d\d:\d\d$/.test(raw)?careLocalInput(raw):raw} onChange={e=>change(key,e.target.value)}/></CareField>;};
  return <>
    <p className="care-subtle">Registro cualitativo de Recovery. Describe hechos y fuentes; la rúbrica propuesta se revisa semanalmente, sin niveles en esta actividad.</p>
    {text("objective","Actividad y objetivo trabajado")}
    <input type="hidden" name="evolution" value={payload.evolution||"not_evaluable"}/>
    {select("activity_type","Tipo de actividad Recovery",recoveryActivityLabels)}
    {select("recovery_participation","Participación en la actividad",recoveryParticipationLabels)}
    {text("participation_reason","Motivo de participación parcial o ausencia")}
    {select("support","Apoyo necesario observado",recoverySupportLabels)}
    <details open><summary>Hechos y apoyo</summary>
      {text("facts","Hechos observados","Indica la tarea y el resultado. Si no fue observable, deja constancia expresa.")}
      {text("progress","Avances","Describe qué hizo por sí mismo o indica expresamente que no hubo avances observables.")}
      {text("difficulties","Dificultades e incumplimientos","Separa lo observado de lo informado; si no hubo dificultades observables, indícalo expresamente.")}
      {text("account","Información declarada y su fuente")}
      {text("support_details","Apoyo efectivamente prestado o motivo no observable","No observable es diferente de sin apoyo.")}
      {select("evidence_source","Tipo de evidencia",recoveryEvidenceLabels)}
      {text("evidence","Evidencia y fuente concreta","Cómo se verificó, qué registro respalda el hecho o quién lo declaró. Un autorreporte no es verificación directa.")}
    </details>
    <details><summary>Nuevo compromiso y revisión</summary>
      <p>Acuerda una tarea real o registra expresamente por qué no se acordó una nueva. Se guarda junto con la finalización, sin duplicar la actividad.</p>
      {text("commitment_title","Nuevo compromiso")}
      {select("commitment_responsible","Responsable del compromiso",{patient:"Paciente",self:"Profesional que registra"})}
      {date("commitment_due_at","Plazo del compromiso (hora de Chile)")}
      {date("commitment_review_at","Próxima revisión del compromiso (hora de Chile)")}
      {text("commitment_method","Forma de verificar el compromiso")}
      {text("no_commitment_reason","Motivo por el que no se acordó nuevo compromiso")}
      <p className="care-subtle">El compromiso se guarda en coordinación interna. Compartirlo al paciente exige la publicación explícita de Planificación.</p>
    </details>
    {["interpretation","participation","commitment_note","next_action","punctuality_observation","responsibilities","autonomy","organisation","initiative","behaviour"].map(key=><input key={key} type="hidden" name={key} value={payload[key]??""}/>)}
  </>;
}
