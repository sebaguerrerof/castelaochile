import test from "node:test";
import assert from "node:assert/strict";
import { validateRecoveryActivity,recoveryActivityFields } from "../src/lib/care/recovery-coach.ts";
const complete={...Object.fromEntries(recoveryActivityFields.map(k=>[k,""])),activity_type:"individual",recovery_participation:"full",support:"occasional",support_details:"Apoyo observado neutral",facts:"Tarea y resultado neutral",progress:"Sin avances observables",difficulties:"Sin dificultades observables",evidence_source:"observed",evidence:"Observación directa neutral",no_commitment_reason:"No se acordó nueva tarea"};
test("Recovery permite borrador incompleto y exige constancias cualitativas al finalizar",()=>{
 const empty=Object.fromEntries(recoveryActivityFields.map(k=>[k,""]));assert.doesNotThrow(()=>validateRecoveryActivity(empty,false));assert.throws(()=>validateRecoveryActivity(empty,true));assert.doesNotThrow(()=>validateRecoveryActivity(complete,true));
 for(const key of ["facts","progress","difficulties","evidence","support_details"])assert.throws(()=>validateRecoveryActivity({...complete,[key]:""},true));
});
test("Ausencia no se convierte en sin apoyo, y participación parcial exige motivo",()=>{
 assert.throws(()=>validateRecoveryActivity({...complete,recovery_participation:"absent",support:"none",participation_reason:"Ausencia registrada"},true));
 assert.doesNotThrow(()=>validateRecoveryActivity({...complete,recovery_participation:"absent",support:"not_observable",participation_reason:"Ausencia registrada"},true));
 assert.throws(()=>validateRecoveryActivity({...complete,recovery_participation:"partial"},true));
});
test("Compromiso real requiere identificador, responsable, plazo, revisión y método; no se inventa desde vacíos",()=>{
 const commitment={...complete,no_commitment_reason:"",commitment_title:"Tarea concreta neutral",recovery_commitment_id:"a2000000-0000-4000-8000-000000000001",commitment_responsible:"patient",commitment_due_at:"2026-10-11T12:00:00Z",commitment_review_at:"2026-10-12T12:00:00Z",commitment_method:"Revisar resultado con el paciente"};
 assert.doesNotThrow(()=>validateRecoveryActivity(commitment,true));
 for(const key of ["recovery_commitment_id","commitment_responsible","commitment_due_at","commitment_review_at","commitment_method"])assert.throws(()=>validateRecoveryActivity({...commitment,[key]:""},true));
 assert.throws(()=>validateRecoveryActivity({...commitment,no_commitment_reason:"No hubo acuerdo"},true));
});
