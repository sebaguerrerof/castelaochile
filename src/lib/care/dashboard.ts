import { z } from "zod";

const count=z.number().int().nonnegative();
export const dashboardSchema=z.object({cutoff:z.iso.datetime({offset:true}),start_at:z.iso.datetime({offset:true}),days:z.number(),active:count,alerts:count,requests:count,pending_records:count,scoped_total:count,
 attendance:z.object({present:count,absent:count,justified:count,pending:count,total:count}),reports:z.object({on_time:count,late:count,omitted:count,total:count}),
 series:z.array(z.object({day:z.iso.date(),attendance_n:count,attendance_N:count,reports_n:count,reports_N:count})),
 quality:z.object({missing_windows:count,invalid_windows:count,unconfigured_patients:count,scheduler_verified:z.boolean()})});
export const dashboardPatientsSchema=z.object({total:count,patients:z.array(z.object({id:z.uuid(),display_name:z.string(),is_active:z.boolean(),treatment_active:z.boolean(),color:z.enum(["green","yellow","red","gray"]),review_expired:z.boolean().nullable(),review_at:z.string().nullable(),review_id:z.uuid().nullable(),alerts:count,request_id:z.uuid().nullable(),request_due:z.string().nullable()}))});
export const alertSchema=z.object({id:z.uuid(),patient_id:z.uuid(),kind:z.enum(["report_omitted","commitment_overdue","recovery_repeated_unfulfilled"]),source_id:z.uuid(),rule_version:count,triggered_at:z.string(),state:z.enum(["open","received","resolved"]),version:count});
export const dashboardAlertsSchema=z.object({total:count,alerts:z.array(alertSchema.extend({display_name:z.string()})),last_action:z.object({state:z.enum(["received","resolved"]),at:z.string()}).nullable()});
export const dashboardSourcesSchema=z.object({total:count,start_at:z.string(),cutoff:z.string(),rows:z.array(z.object({patient_id:z.uuid(),display_name:z.string(),source_id:z.uuid(),occurred_at:z.string(),label:z.string(),category:z.string(),professional_id:z.uuid().nullable(),specialty:z.string().nullable(),local_day:z.string().nullable()}))});
export const followupSchema=z.object({cutoff:z.string(),reviews:z.array(z.object({id:z.uuid(),revision:count,color:z.enum(["green","yellow","red"]),occurred_at:z.string(),review_at:z.string(),created_at:z.string(),actor_id:z.uuid(),reason:z.string(),record_id:z.uuid(),record_revision:z.number().int().positive()})),alerts:z.array(alertSchema.extend({history:z.array(z.object({version:count,state:z.string(),reason:z.string(),recorded_at:z.string(),actor_id:z.uuid()}))}))});
export const assessmentSchema=z.object({patient_id:z.uuid(),version:z.coerce.number().int().nonnegative(),color:z.enum(["green","yellow","red"]),occurred_at:z.iso.datetime({offset:true}),review_at:z.iso.datetime({offset:true}),reason:z.string().trim().min(3).max(600),record_id:z.uuid(),confirm_approved:z.literal(true)}).superRefine((p,ctx)=>{
 if(Date.parse(p.occurred_at)>Date.now())ctx.addIssue({code:"custom",path:["occurred_at"],message:"La valoración debe corresponder a un hecho pasado."});
 if(Date.parse(p.review_at)<=Date.now())ctx.addIssue({code:"custom",path:["review_at"],message:"Indica la próxima revisión en el futuro."});
});
export const alertActionSchema=z.object({id:z.uuid(),version:z.coerce.number().int().positive(),reason:z.string().trim().min(3).max(600)});
export const followupLabels={green:"Verde · valoración validada",yellow:"Amarillo · requiere seguimiento",red:"Rojo · prioridad validada",gray:"Gris · sin valoración vigente"} as const;
export const sourceLabels:Record<string,string>={present:"Presente",absent:"Ausente",justified:"Justificada",pending:"Asistencia sin registrar",on_time:"En plazo",late:"Enviado tarde",omitted:"Omitido",pending_record:"Registro pendiente"};
export function dashboardDays(value:unknown):7|30|90{return value==="7"?7:value==="90"?90:30;}
export function operationalRatio(n:number,N:number){return N===0?"No aplica · 0/0":`${new Intl.NumberFormat("es-CL",{maximumFractionDigits:1}).format(n/N*100)} % · ${n}/${N}`;}
export function sourceHref(metric:string,row:{patient_id:string;source_id:string;specialty:string|null;local_day:string|null},canCreate=false){
 const root=`/admin/seguimiento/pacientes/${row.patient_id}`;
 if(metric==="attendance")return `/admin/seguimiento/agenda/${row.source_id}`;
 if(metric==="reports")return `${root}/reportes?dia=${row.local_day}`;
 return canCreate?`${root}/registros/nuevo?actividad=${row.source_id}&tipo=${row.specialty}`:`${root}/registros`;
}

export const alertKindLabels:Record<string,string>={report_omitted:"Reporte omitido al cierre",commitment_overdue:"Compromiso pendiente vencido",recovery_repeated_unfulfilled:"Reiteración Recovery verificada"};
