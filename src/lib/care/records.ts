import { z } from "zod";
import type { RecordSpecialty } from "../../types/care.ts";
import { recoveryActivityFields, recoveryFieldLabels, validateRecoveryActivity } from "./recovery-coach.ts";
export const evolutionLabels={improved:"Mejoría observada",stable:"Estabilidad observada",worsened:"Deterioro observado",not_evaluable:"No evaluable"} as const;
export const commonRecordFields=["objective","evolution","facts","account","interpretation","difficulties","participation","commitment_note","next_action"];
export const specialtyRecordFields:Record<RecordSpecialty,string[]>={psychology:["motivation","progress","recommendations"],recovery:["punctuality_observation","responsibilities","autonomy","organisation","initiative","behaviour"],psychiatry:["control","adherence_reported","adherence_observed","medical_indications","medical_changes","next_visit","shareable_alert"]};
export const recordFieldLabels:Record<string,string>={objective:"Objetivo trabajado",evolution:"Evolución observada",facts:"Hechos observados",account:"Relato del paciente",interpretation:"Interpretación profesional",difficulties:"Dificultades",participation:"Participación observada",commitment_note:"Acuerdos de la sesión",next_action:"Próxima acción",motivation:"Motivación y disposición",progress:"Avances",recommendations:"Recomendaciones",punctuality_observation:"Observación de puntualidad",responsibilities:"Responsabilidades",autonomy:"Autonomía cualitativa",organisation:"Organización",initiative:"Iniciativa",behaviour:"Conducta observada",control:"Control y evolución relevante",adherence_reported:"Adherencia referida",adherence_observed:"Evidencia de adherencia observada",medical_indications:"Indicaciones médicas",medical_changes:"Cambios de indicación",next_visit:"Próximo control (hora de Chile)",shareable_alert:"Situación para coordinación"};
const id=z.uuid();const text=z.string().trim().max(600);
export const recordWriteSchema=z.object({id,patient_id:id,event_id:id,specialty:z.enum(["psychology","recovery","psychiatry"]),version:z.coerce.number().int().min(0),operation_key:id,occurred_at:z.iso.datetime({offset:true}),reserved_note:z.string().trim().max(1200),summary_body:text,summary_visibility:z.enum(["none","coordination","patient"]),request_intervention:z.boolean(),request_body:text,request_due_at:z.union([z.iso.datetime({offset:true}),z.literal("")]),reason:z.string().trim().max(300),confirm_finalize:z.boolean(),confirm_publish:z.boolean()});
export function validateClinicalPayload(kind:RecordSpecialty,payload:Record<string,unknown>,final:boolean){
 const fields=recordPayloadFields(kind);const shape:Record<string,z.ZodType>=Object.fromEntries(fields.map(f=>[f,text]));
 shape.evolution=z.enum(["improved","stable","worsened","not_evaluable",...(final?[]:[""])] as [string,...string[]]);
 if(final)shape.objective=z.string().trim().min(3).max(600);
 const parsed=z.strictObject(shape).parse(payload) as Record<string,string>;
 if(kind==="recovery")validateRecoveryActivity(parsed,final);
 return parsed;
}
export const recordReaderSchema=z.object({id,reader:id});
export function recordPayloadFields(kind:RecordSpecialty){return [...commonRecordFields,...specialtyRecordFields[kind],...(kind==="recovery"?recoveryActivityFields:[])];}
Object.assign(recordFieldLabels,recoveryFieldLabels);
