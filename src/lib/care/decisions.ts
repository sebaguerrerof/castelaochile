import { z } from "zod";
const count=z.number().int().nonnegative();
const nullableDate=z.string().nullable();
export const decisionSchema=z.object({id:z.uuid(),patient_id:z.uuid(),author_id:z.uuid(),responsible_id:z.uuid().nullable(),state:z.enum(["draft","active","closed","cancelled"]),situation:z.string(),evaluation:z.string(),decision:z.string(),planned_at:nullableDate,review_at:nullableDate,record_id:z.uuid().nullable(),record_revision:count.nullable(),request_id:z.uuid().nullable(),alert_id:z.uuid().nullable(),result:z.string(),version:count,revision:count,created_at:z.string(),updated_at:z.string()});
export const taskSchema=z.object({id:z.uuid(),patient_id:z.uuid(),assignee_id:z.uuid(),instruction:z.string(),due_at:nullableDate,event_id:z.uuid().nullable(),state:z.enum(["pending","in_progress","reported","completed","cancelled"]),result:z.string(),verification:z.string(),reported_at:nullableDate,completed_at:nullableDate,version:count,created_by:z.uuid(),created_at:z.string(),updated_at:z.string()});
export const decisionReadSchema=z.object({decision:decisionSchema,draft:z.record(z.string(),z.unknown()).nullable(),versions:z.array(z.object({revision:count,snapshot:decisionSchema,actor_id:z.uuid(),reason:z.string(),recorded_at:z.string()})),tasks:z.array(taskSchema)});
export const taskReadSchema=z.object({task:taskSchema,direction:z.boolean(),decision_id:z.uuid().nullable(),effective_due_at:nullableDate,agenda_cancelled:z.boolean(),history:z.array(z.object({version:count,snapshot:taskSchema,actor_id:z.uuid(),reason:z.string(),recorded_at:z.string()}))});
export const decisionListSchema=z.object({total:count,rows:z.array(decisionSchema.pick({id:true,patient_id:true,state:true,version:true,revision:true,planned_at:true,review_at:true,author_id:true,responsible_id:true,created_at:true}).extend({display_name:z.string()}))});
export const decisionOptionsSchema=z.object({responsibles:z.array(z.object({id:z.uuid(),label:z.string(),direction:z.boolean(),delegate:z.boolean()})),records:z.array(z.object({id:z.uuid(),revision:count,specialty:z.string(),occurred_at:z.string()})),requests:z.array(z.object({id:z.uuid(),record_id:z.uuid(),created_at:z.string()})),alerts:z.array(z.object({id:z.uuid(),kind:z.string(),triggered_at:z.string()})),events:z.array(z.object({id:z.uuid(),title:z.string(),professional_id:z.uuid(),ends_at:z.string()}))});
export const supervisionSchema=z.object({cutoff:z.string(),start_at:z.string(),team:z.boolean(),total:count,summary:z.object({total:count,pending:count,overdue:count,reported:count,completed:count,cancelled:count}),professionals:z.array(z.object({id:z.uuid(),label:z.string()})),rows:z.array(z.object({source_id:z.uuid(),patient_id:z.uuid(),display_name:z.string(),label:z.string(),professional_id:z.uuid(),professional_label:z.string(),occurred_at:z.string(),due_at:nullableDate,state:z.string(),category:z.string(),event_id:z.uuid().nullable(),specialty:z.string().nullable(),record_id:z.uuid().nullable()}))});
export const decisionWriteSchema=z.object({id:z.uuid(),patient_id:z.uuid(),version:z.coerce.number().int().nonnegative(),situation:z.string().trim().max(600),evaluation:z.string().trim().max(600),decision:z.string().trim().max(600),responsible_id:z.union([z.uuid(),z.literal("")]),planned_at:z.string(),review_at:z.string(),record_id:z.union([z.uuid(),z.literal("")]),request_id:z.union([z.uuid(),z.literal("")]),alert_id:z.union([z.uuid(),z.literal("")]),reason:z.string().trim().max(600),confirm_final:z.boolean()});
export const taskWriteSchema=z.object({id:z.uuid(),decision_id:z.uuid(),version:z.coerce.number().int().nonnegative(),assignee_id:z.uuid(),instruction:z.string().trim().min(3).max(300),due_at:z.string(),event_id:z.union([z.uuid(),z.literal("")]),reason:z.string().trim().max(300)});
export type Decision=z.infer<typeof decisionSchema>;
export type DelegatedTask=z.infer<typeof taskSchema>;
export type DecisionOptions=z.infer<typeof decisionOptionsSchema>;
export type Supervision=z.infer<typeof supervisionSchema>;
export const decisionLabels={draft:"Borrador privado",active:"Activa",closed:"Cerrada",cancelled:"Cancelada"} as const;
export const taskLabels:Record<string,string>={pending:"Pendiente",in_progress:"En ejecución",overdue:"Vencida",reported:"Resultado por revisar",completed:"Completada",cancelled:"Cancelada",scheduled:"Programada",open:"Por recibir",received:"Recibida",resolved:"Resuelta"};
export const supervisionModes={tasks:"Tareas delegadas",agenda:"Agenda y actividades",records:"Registros de sesión",alerts:"Alertas comunicadas"} as const;
export type SupervisionMode=keyof typeof supervisionModes;
export function supervisionMode(value:string|undefined):SupervisionMode{return value&&value in supervisionModes?value as SupervisionMode:"tasks";}
export function supervisionSource(mode:SupervisionMode,row:Supervision["rows"][number],actor:string){
 const base=`/admin/seguimiento/pacientes/${row.patient_id}`;
 if(mode==="tasks")return `${base}/tareas/${row.source_id}`;
 if(mode==="agenda")return `/admin/seguimiento/agenda/${row.source_id}`;
 if(mode==="alerts")return `${base}/seguimiento`;
 if(row.specialty==="family")return row.record_id?`${base}/familia/${row.record_id}`:row.professional_id===actor?`${base}/familia/nuevo?fuente=${row.source_id}`:`${base}/familia`;
 return row.record_id?`${base}/registros/${row.record_id}`:row.professional_id===actor?`${base}/registros/nuevo?actividad=${row.source_id}&tipo=${row.specialty}`:`${base}/registros`;
}
