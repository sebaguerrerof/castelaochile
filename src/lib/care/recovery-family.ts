import { z } from "zod";
export const dimensionLabels={organisation:"Organización diaria",schedule:"Horarios",obligations:"Obligaciones",independence:"Ejecución sin supervisión",initiative:"Iniciativa",coherence:"Coherencia entre lo declarado y observado",family_support:"Apoyo familiar",habits:"Hábitos"} as const;
export type Dimension=keyof typeof dimensionLabels;
export const dimensionKeys=Object.keys(dimensionLabels) as Dimension[];
export const familyFields={communication:"Comunicación",limits:"Límites",responsibilities:"Responsabilidades",support:"Apoyo y rescate o sobreprotección",progress:"Avances",observations:"Observaciones"} as const;
export const sourceLabels={observed:"Observado en la sesión",family_report:"Referido por la familia",patient_report:"Referido por el paciente"};
export const evaluationLabels={evaluated:"Evaluado",not_evaluable:"No evaluable"};
export const agreementStates={pending:"Pendiente",completed:"Cumplido y verificado",cancelled:"Cancelado"};
export type Rubric={id:string;family_id:string;version:number;name:string;dimensions:{key:Dimension;levels:{key:string;label:string}[]}[];ordered:boolean;state:"draft"|"approved"|"retired";revision:number;approved_at:string|null;approval_reference:string};
export type Autonomy={id:string;patient_id:string;record_id:string;source_revision:number;dimension:Dimension;rubric_id:string|null;author_id:string;occurred_at:string;status:"draft"|"final";version:number;revision:number};
export type ObservationPayload={status:""|"evaluated"|"not_evaluable";level:string;evidence:string};
export type AutonomyDetail={observation:Autonomy;can_write:boolean;rubric:Rubric|null;draft:{payload:ObservationPayload;occurred_at:string}|null;versions:{revision:number;occurred_at:string;payload:ObservationPayload;reason:string;recorded_at:string;actor_id:string}[]};
export type SeriesPoint={id:string;dimension:Dimension;rubric_id:string|null;author_id:string;occurred_at:string;revision:number;status:"evaluated"|"not_evaluable";level:string};
export type AutonomyList={start_at:string|null;cutoff:string;total:number;rows:Autonomy[];series:SeriesPoint[]};
export type FamilyRecord={id:string;patient_id:string;event_id:string;author_id:string;occurred_at:string;status:"draft"|"final";version:number;revision:number};
export type FamilyPayload={objective:string;source:keyof typeof sourceLabels|"";participants:{label:string;relationship:string}[]}&Record<keyof typeof familyFields,string>;
export type Agreement={id:string;record_id:string;source_revision:number;title:string;responsible:string;due_at:string;state:keyof typeof agreementStates;share_patient:boolean;patient_body:string;result:string;version:number;history:{id:number;reason:string;recorded_at:string;actor_id:string;snapshot:{state:string;share_patient:boolean;patient_body:string}}[]};
export type FamilyDetail={record:FamilyRecord;can_write:boolean;draft:{payload:FamilyPayload;reserved_note:string;occurred_at:string}|null;versions:{revision:number;occurred_at:string;payload:FamilyPayload;reserved_note_id:string|null;reserved_note:string|null;reason:string;actor_id:string;recorded_at:string}[];eligible_readers:string[];readers:{note_id:string;user_id:string}[];agreements:Agreement[]};
export type FamilyList={start_at:string|null;cutoff:string;total:number;rows:FamilyRecord[];sessions:{expected:number;performed:number;finalized:number};agreements:{due:number;completed:number};events:{id:string;title:string;starts_at:string}[];sources:{id:string;title:string;starts_at:string;status:"scheduled"|"completed"}[]};
export type SharedAgreements={total:number;rows:{id:string;patient_body:string;due_at:string;state:keyof typeof agreementStates;completed_at:string|null;updated_at:string}[]};
export const writeIdentity=z.object({id:z.uuid(),version:z.coerce.number().int().min(0),patient_id:z.uuid().optional()});
export const observationPayload=z.object({status:z.enum(["","evaluated","not_evaluable"]),level:z.string().max(30),evidence:z.string().trim().max(600)});
export const familyPayload=z.object({objective:z.string().trim().max(600),source:z.enum(["","observed","family_report","patient_report"]),participants:z.array(z.object({label:z.string().trim().min(2).max(60),relationship:z.string().trim().min(2).max(50)})).max(6),...Object.fromEntries(Object.keys(familyFields).map(k=>[k,z.string().trim().max(600)]))});
export function currentRubrics(rows:Rubric[]){return rows.filter(r=>r.state==="approved"&&!rows.some(n=>n.family_id===r.family_id&&n.state!=="draft"&&n.version>r.version));}
export function recoveryPeriod(raw?:string){return ["7","30","90","episode"].includes(raw??"")?raw!:"30";}
