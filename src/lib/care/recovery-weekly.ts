import { z } from "zod";
export const recoveryDimensionKeys=["planificacion_personal","cumplimiento","autonomia_cotidiana","responsabilidad","iniciativa","habitos_constancia","organizacion_ocupacional","coherencia_conductual"] as const;
export type RecoveryDimension=typeof recoveryDimensionKeys[number];
export const rubricStateLabels={proposal:"Propuesta pendiente de aprobación",pilot:"Piloto autorizado — rúbrica no aprobada",approved:"Rúbrica aprobada",retired:"Versión retirada"} as const;
export type RecoveryLevel={key:string;label:string;description:string};
export type RecoveryRubric={id:string;family_id:string;version:number;document_code:string;document_version:string;source_reference:string;name:string;dimensions:{key:RecoveryDimension;label:string;description:string;levels:RecoveryLevel[]}[];governance_state:keyof typeof rubricStateLabels;revision:number;effective_from:string|null;pilot_start:string|null;pilot_end:string|null;criteria_enabled:boolean;approval_reference:string;participants:string[];history:{id:number;actor_id:string|null;recorded_at:string;reason:string;snapshot:unknown}[]};
const text=z.string().trim().max(600);
export const weeklyDimensionSchema=z.object({key:z.enum(recoveryDimensionKeys),status:z.enum(["","qualitative","evaluated","SE"]),level:z.string().nullable(),evidence:text,evidence_sufficient:z.boolean(),support:text,result:text,difficulties:text,se_reason:text,record_ids:z.array(z.uuid()).max(20),commitment_ids:z.array(z.uuid()).max(20),next_commitment_id:z.uuid().nullable()}).strict();
export const weeklyPayloadSchema=z.object({dimensions:z.array(weeklyDimensionSchema).length(8)}).strict();
export type WeeklyPayload=z.infer<typeof weeklyPayloadSchema>;
export function emptyWeeklyPayload():WeeklyPayload{return {dimensions:recoveryDimensionKeys.map(key=>({key,status:"",level:null,evidence:"",evidence_sufficient:false,support:"",result:"",difficulties:"",se_reason:"",record_ids:[],commitment_ids:[],next_commitment_id:null}))};}
export function validateWeeklyPayload(payload:unknown,final:boolean){
  const parsed=weeklyPayloadSchema.parse(payload);const issues:z.core.$ZodIssue[]=[];
  if(new Set(parsed.dimensions.map(d=>d.key)).size!==8)issues.push({code:"custom",path:["dimensions"],message:"Las ocho dimensiones deben ser diferentes.",input:payload});
  if(final)parsed.dimensions.forEach((d,index)=>{
    const issue=(field:string,message:string)=>issues.push({code:"custom",path:["dimensions",index,field],message,input:d});
    if(!d.status)issue("status","Selecciona categoría; ninguna está preseleccionada.");
    if(d.status==="SE"){
      if(d.se_reason.length<3)issue("se_reason","Explica por qué no hay evidencia suficiente.");
      if(d.level||d.evidence_sufficient)issue("level","Sin evaluar no lleva nivel ni evidencia suficiente.");
    }else if(d.status){
      for(const field of ["evidence","support","result","difficulties"] as const)if(d[field].length<3)issue(field,"Registra evidencia, apoyo, resultado y dificultades o constancia expresa.");
      if(!d.record_ids.length&&!d.commitment_ids.length)issue("record_ids","Enlaza al menos una fuente autorizada.");
      if(!d.next_commitment_id)issue("next_commitment_id","Enlaza el siguiente compromiso con su revisión.");
      if(d.status==="evaluated"&&(!["1","2","3","4"].includes(d.level??"")||!d.evidence_sufficient))issue("level","Selecciona nivel manual y confirma evidencia suficiente.");
      if(d.status==="qualitative"&&d.level)issue("level","La revisión cualitativa no lleva nivel.");
    }
  });
  if(issues.length)throw new z.ZodError(issues);return parsed;
}
export type RecoveryWeek={id:string;patient_id:string;rubric_id:string;week_start:string;author_id:string;status:"draft"|"final";version:number;revision:number;evaluated_at:string;occurred_at:string;mode:"proposal"|"pilot"|"approved";payload:WeeklyPayload|null};
export type WeeklyVersion={revision:number;payload:WeeklyPayload;mode:RecoveryWeek["mode"];reason:string;recorded_at:string;actor_id:string;occurred_at:string;evaluated_at:string;source_snapshots:{kind:string;id:string;revision?:number;version?:number}[]};
export type WeeklyDetail={week:RecoveryWeek;can_write:boolean;levels_allowed:boolean;draft:{payload:WeeklyPayload;occurred_at:string;evaluated_at:string}|null;versions:WeeklyVersion[]};
export type RecoveryValidation={id:string;rubric_id:string;window_end:string;decision:"validated"|"rejected"|"correction_requested";recorded_at:string;actor_id:string;reason:string;requires_review:boolean};

export const recoveryDimensionLabels:Record<RecoveryDimension,string>={planificacion_personal:"Planificación personal",cumplimiento:"Cumplimiento",autonomia_cotidiana:"Autonomía cotidiana",responsabilidad:"Responsabilidad",iniciativa:"Iniciativa",habitos_constancia:"Hábitos y constancia",organizacion_ocupacional:"Organización ocupacional",coherencia_conductual:"Coherencia conductual"};
