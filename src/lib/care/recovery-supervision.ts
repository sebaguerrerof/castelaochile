import { z } from "zod";
import { careWeekRange } from "./time.ts";
import { recoveryDimensionKeys,type RecoveryRubric,type RecoveryWeek,type WeeklyPayload } from "./recovery-weekly.ts";
const count=z.number().int().nonnegative();
export const recoverySourceKinds={activity:"Apoyo en actividades",commitment:"Resultados de compromisos",record_expected:"Registros desde agenda",weekly_expected:"Revisiones semanales elegibles"} as const;
export const recoverySupervisionSchema=z.object({contract:z.literal(1),cutoff:z.string(),module_start:z.string(),start_at:z.string().nullable(),population:count,overdue:count,review_due:count,total:count,
 counts:z.array(z.object({kind:z.enum(["activity","commitment","record_expected","weekly_expected"]),category:z.string(),n:count})),
 rows:z.array(z.object({patient_id:z.uuid(),display_name:z.string(),source_id:z.uuid().nullable(),kind:z.enum(["activity","commitment","record_expected","weekly_expected"]),category:z.string(),occurred_at:z.string(),label:z.string(),revision:count.nullable(),week_start:z.string().nullable(),rubric_id:z.uuid().nullable(),mode:z.string().nullable(),due_at:z.string().nullable(),review_at:z.string().nullable(),declared_self:z.boolean().nullable(),overdue:z.boolean(),review_due:z.boolean()}))});
export type RecoverySupervision=z.infer<typeof recoverySupervisionSchema>;
export type WeeklySeriesRow=RecoveryWeek&{payload:WeeklyPayload|null};
export function recoverySourceHref(r:RecoverySupervision["rows"][number]){
 const base=`/admin/seguimiento/pacientes/${r.patient_id}`;
 if(r.kind==="activity")return `${base}/registros/${r.source_id}#revision-${r.revision}`;
 if(r.kind==="record_expected")return `/admin/seguimiento/agenda/${r.source_id}`;
 if(r.kind==="weekly_expected")return `${base}/recovery/semanal?semana=${r.week_start}${r.rubric_id?`&rubrica=${r.rubric_id}`:""}`;
 return `${base}/recovery#compromiso-${r.source_id}`;
}
export function weeklyTimeline(first:string,last:string,rows:WeeklySeriesRow[],rid:string,mode:RecoveryWeek["mode"]){
 const weeks:string[]=[];let day=careWeekRange(first).monday;const end=careWeekRange(last).monday;
 if(Date.parse(end)-Date.parse(day)>366*86400000||day>end)throw new Error("Periodo máximo de un año.");
 while(day<=end){weeks.push(day);day=careWeekRange(day).next;}
 return recoveryDimensionKeys.map(key=>({key,points:weeks.map(week=>{const row=rows.find(r=>r.week_start===week&&r.rubric_id===rid&&r.mode===mode&&r.status==="final");const dimension=row?.payload?.dimensions.find(d=>d.key===key);
 return {week,row,dimension,level:dimension?.status==="evaluated"&&["1","2","3","4"].includes(dimension.level??"")?Number(dimension.level):null};})}));
}
export function weeklyDimensionLabel(rubric:RecoveryRubric,key:string,status:string|undefined,level:string|null|undefined){
 if(!status)return "Sin revisión registrada";
 if(status==="SE")return "SE — Sin evaluar";
 if(status==="qualitative")return "Cualitativa sin nivel";
 return rubric.dimensions.find(d=>d.key===key)?.levels.find(l=>l.key===level)?.label??"Sin nivel registrado";
}
