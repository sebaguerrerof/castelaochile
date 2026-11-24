import Link from "next/link";
import { CareField,CareForm } from "./care-form";
import { AdminPanel } from "@/components/admin/admin-ui";
import { recoveryOutcomeLabels,type RecoveryCommitmentReview } from "@/lib/care/recovery-coach";
import { careTimestamp } from "@/lib/care/time";
import type { CareCommitment } from "@/types/care";
import { recoveryCommitmentAction } from "@/app/admin/(secured)/seguimiento/recovery-coach-actions";
export type RecoveryCommitment=CareCommitment&{source_record_id:string;review_at:string;verification_method:string;reviews:RecoveryCommitmentReview[]};
export function RecoveryCommitments({pid,rows,canWrite,cutoff}:{pid:string;rows:RecoveryCommitment[];canWrite:boolean;cutoff:number}){
  return <AdminPanel title="Compromisos verificables" description="El resultado profesional se registra con evidencia. Vencido y pendiente de revisión son indicadores temporales; no acreditan incumplimiento.">
    {!rows.length&&<p>No hay compromisos vinculados a registros Recovery en este alcance.</p>}
    <div className="care-cards">{rows.map(c=>{const current=c.reviews[0];return <article key={c.id} id={`compromiso-${c.id}`} className="care-card">
      <h3>{c.title}</h3><p>{c.status==="cancelled"?"Cancelado administrativamente":recoveryOutcomeLabels[current?.outcome??"pending"]} · {c.responsible_kind==="patient"?"Responsable: paciente":"Responsable: profesional"}</p>
      <p>Plazo {careTimestamp(c.due_at)} · revisión {careTimestamp(c.review_at)}</p><p>Verificación acordada: {c.verification_method}</p>
      {c.status!=="cancelled"&&c.status!=="completed"&&c.due_at&&Date.parse(c.due_at)<cutoff&&<p>Plazo vencido; el resultado exige revisión.</p>}
      {c.confirmation==="self"&&<p>El paciente declaró realización; esa declaración no reemplaza la revisión profesional.</p>}
      <Link href={`/admin/seguimiento/pacientes/${pid}/registros/${c.source_record_id}`} prefetch={false}>Abrir registro de origen</Link>
      <details><summary>Revisiones y evidencia ({c.reviews.length})</summary>{c.reviews.map(v=><div key={v.id}><h4>{recoveryOutcomeLabels[v.outcome]} · {careTimestamp(v.recorded_at)}</h4><p>{v.result}</p><p>Evidencia: {v.evidence}</p><p>Apoyo recibido: {v.support}</p><p>Dificultades: {v.difficulties}</p><p>Motivo: {v.reason}</p></div>)}</details>
      {canWrite&&c.status!=="cancelled"&&<details><summary>Registrar revisión o corregir resultado</summary><CareForm action={recoveryCommitmentAction} label="Guardar revisión con evidencia">
        <input type="hidden" name="id" value={c.id}/><input type="hidden" name="version" value={c.version}/>
        <CareField name="outcome" label="Resultado profesional"><select required defaultValue=""><option value="" disabled>Selecciona resultado</option>{Object.entries(recoveryOutcomeLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></CareField>
        {[["result","Resultado observado o verificado"],["evidence","Evidencia y fuente de la revisión"],["support","Apoyo recibido al realizar el compromiso"],["difficulties","Dificultades observadas o informadas"]].map(([key,label])=><CareField key={key} name={key} label={label}><textarea rows={2} required minLength={3} maxLength={600}/></CareField>)}
        <CareField name="reason" label="Motivo de la revisión o corrección"><input required minLength={3} maxLength={300}/></CareField>
        <p className="care-subtle">No verificable indica evidencia insuficiente. Esta revisión conserva anteriores; para un nuevo acuerdo usa el registro de actividad.</p>
      </CareForm></details>}
    </article>;})}</div>
  </AdminPanel>;
}
