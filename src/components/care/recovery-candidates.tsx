import { randomUUID } from "node:crypto";
import { AdminPanel } from "@/components/admin/admin-ui";
import { CareField,CareForm } from "./care-form";
import { recoveryValidationAction } from "@/app/admin/(secured)/seguimiento/recovery-coach-actions";
import { careTimestamp } from "@/lib/care/time";
import type { Json } from "@/types/database";
import type { RecoveryValidation } from "@/lib/care/recovery-weekly";
export function RecoveryCandidates({pid,rid,windowEnd,candidate,validations,canValidate}:{pid:string;rid:string;windowEnd:string;candidate:{eligible:boolean;reason:string;weeks?:Json[]};validations:RecoveryValidation[];canValidate:boolean}){
 const labels={validated:"Validado por Dirección",rejected:"Candidatura rechazada",correction_requested:"Corrección solicitada"};
 return <AdminPanel title="Candidatura y validación de Dirección" description="La aprobación de la rúbrica, su criterio y la validación individual son decisiones diferentes.">
  <p>{candidate.reason}. Ventana: cuatro semanas comunes hasta la semana {windowEnd}.</p>
  <p>La autonomía funcional no implica alta clínica, ausencia de riesgo de recaída ni finalización del tratamiento.</p>
  {candidate.eligible&&canValidate&&<CareForm action={recoveryValidationAction} label="Registrar decisión de Dirección"><input type="hidden" name="id" value={randomUUID()}/><input type="hidden" name="patient_id" value={pid}/><input type="hidden" name="rubric_id" value={rid}/><input type="hidden" name="window_end" value={windowEnd}/><input type="hidden" name="weeks" value={JSON.stringify(candidate.weeks)}/><CareField name="decision" label="Decisión de Dirección sobre esta evidencia"><select defaultValue="" required><option value="" disabled>Selecciona decisión</option>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></CareField><CareField name="reason" label="Motivo y evidencia de la decisión"><textarea required rows={3} minLength={3} maxLength={600}/></CareField><CareField name="confirm" label="Confirmo revisión humana de las ocho dimensiones y esta ventana"><input type="checkbox" required/></CareField></CareForm>}
  <details><summary>Decisiones conservadas ({validations.length})</summary>{validations.map(v=><article key={v.id}><h3>{labels[v.decision]} · {careTimestamp(v.recorded_at)}</h3><p>{v.reason}</p><p>Semana final de la ventana {v.window_end} · Dirección autenticada.</p>{v.requires_review&&<p role="status">Requiere revisión: la evidencia o configuración cambió. La decisión original se conserva.</p>}</article>)}</details>
 </AdminPanel>;
}
