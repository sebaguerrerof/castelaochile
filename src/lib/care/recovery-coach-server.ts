import "server-only";
import { recoveryPatient } from "./recovery-family-server";
import { careResponsibles,careDirectory,carePatient } from "./server";
import type { RecoveryCommitment } from "@/components/care/recovery-commitments";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCare } from "./server";
import { careWeekRange,careLocalInput,careTimestamp } from "./time";
import type { RecoveryRubric,WeeklyDetail,RecoveryValidation } from "./recovery-weekly";
import { recoverySupervisionSchema,recoverySourceKinds,type WeeklySeriesRow } from "./recovery-supervision";
import { requireDashboard } from "./dashboard-server";
import { metricOptionsSchema } from "./metrics";
import { carePage } from "./policy";
import { requireAdmin } from "@/lib/auth/admin";
export async function recoveryCommitments(pid:string){
  const context=await recoveryPatient(pid);
  const {data:{user}}=await context.client.auth.getUser();
  const admin=await requireAdmin();
  const canWrite=context.caps.includes("care.records.create") && (admin.role==="superadmin" || (await careResponsibles(pid)).some(row=>row.user_id===user?.id && ["recovery","direction"].includes(row.specialty)));
  const {data,error}=await context.client.rpc("care_rc_commitments",{pid});
  if(error)throw new Error("No fue posible leer los compromisos Recovery.");
  return {...context,rows:data as unknown as RecoveryCommitment[],canWrite,cutoff:Date.now()};
}
export type RecoverySupervisionQuery={periodo?:string;grupo?:string;paciente?:string;tipo?:string;categoria?:string;pagina?:string;q?:string;nomina?:string};
export async function recoverySupervisionContext(query:RecoverySupervisionQuery,pid?:string){
 const context=await requireDashboard(),period=["7","30","90"].includes(query.periodo??"")?query.periodo!:"30",page=carePage(query.pagina);
 const kind=query.tipo&&Object.hasOwn(recoverySourceKinds,query.tipo)?query.tipo as keyof typeof recoverySourceKinds:"activity";
 const allowedCategories=kind==="activity"?["constant","frequent","occasional","none","not_observable"]:kind==="commitment"?["pending","fulfilled","unfulfilled","unverifiable","cancelled","overdue","review_due"]:["final","draft","pending"];
 const category=allowedCategories.includes(query.categoria??"")?query.categoria!:"",patient=pid??query.paciente;
 for(const value of [patient,query.grupo].filter(Boolean))if(!z.uuid().safeParse(value).success)notFound();
 const p={period,...(patient?{patient}:{}),...(query.grupo?{group:query.grupo}:{})};
 const [result,options]=await Promise.all([context.client.rpc("care_rc_supervision",{p,source_kind:kind,source_category:category,page}),context.client.rpc("care_metric_options")]);
 if(result.error||options.error)throw new Error("No fue posible leer supervisión Recovery autorizada.");
 const directory=pid?{patients:[],total:0}:await careDirectory(query.q??"",carePage(query.nomina));
 if(patient&&!pid&&!directory.patients.some(row=>row.id===patient))directory.patients.push((await carePatient(patient)).patient);
 const data=recoverySupervisionSchema.parse(result.data);return {...context,data,options:metricOptionsSchema.parse(options.data),directory,period,page,kind,category,patient};
}
export async function recoveryWeeklySeries(pid:string,first:string,last:string){
 const context=await recoveryPatient(pid),rubrics=await recoveryRubricCatalog();
 const result=await context.client.rpc("care_rc_weeks",{pid,first_day:careWeekRange(first).monday,last_day:careWeekRange(last).monday});
 if(result.error)throw new Error("No fue posible leer evolución semanal.");
 return {rows:(result.data as unknown as {rows:WeeklySeriesRow[]}).rows,rubrics};
}
export async function recoveryRubricCatalog(){const {client}=await requireCare("care.records.read");const r=await client.rpc("care_rc_catalog");if(r.error)throw new Error("No fue posible leer la propuesta Recovery.");return r.data as unknown as RecoveryRubric[];}
export async function recoveryWeeklySource(pid:string,wid:string){
 if(!z.uuid().safeParse(wid).success)notFound();const {client}=await recoveryPatient(pid);const result=await client.rpc("care_rc_week_read",{wid});
 if(result.error)notFound();const data=result.data as unknown as WeeklyDetail;if(data.week.patient_id!==pid)notFound();return data.week;
}
export async function recoveryWeeklyContext(pid:string,week?:string,rubricId?:string){
  const context=await recoveryCommitments(pid),rubrics=await recoveryRubricCatalog();
  if(rubricId&&!z.uuid().safeParse(rubricId).success)notFound();
  const rubric=rubrics.find(r=>r.id===rubricId)??(!rubricId?rubrics.find(r=>r.governance_state!=="retired")??rubrics[0]:undefined);if(!rubric)notFound();
  const range=careWeekRange(week);const result=await context.client.rpc("care_rc_week_context",{pid,rid:rubric.id,wday:range.monday});
  if(result.error)throw new Error("No fue posible leer la revisión semanal.");
  const data=result.data as unknown as {levels_allowed:boolean;can_write:boolean;blocked:boolean;detail:WeeklyDetail|null;cutoff:string};
  const records=await context.client.from("care_session_records").select("id,occurred_at,revision").eq("patient_id",pid).eq("specialty","recovery").eq("status","final").gte("occurred_at",range.start).lt("occurred_at",range.end).order("occurred_at",{ascending:false}).limit(50);
  if(records.error)throw new Error("No fue posible leer los registros fuente.");
  const first=new Date(range.monday+"T12:00:00Z");first.setUTCDate(first.getUTCDate()-21);
  const [candidate,window]=await Promise.all([context.client.rpc("care_rc_candidate_read",{pid,rid:rubric.id,wend:range.monday}),context.client.rpc("care_rc_weeks",{pid,first_day:first.toISOString().slice(0,10),last_day:range.monday})]);
  if(candidate.error||window.error)throw new Error("No fue posible leer candidatura e historial de validación.");
  return {...context,rubrics,rubric,range,data,candidate:candidate.data as unknown as {eligible:boolean;reason:string;weeks?:import("@/types/database").Json[]},validations:(window.data as unknown as {validations:RecoveryValidation[]}).validations.filter(v=>v.rubric_id===rubric.id),canWrite:data.can_write&&range.monday<=careWeekRange().monday,defaultOccurred:careLocalInput(range.start),defaultEvaluated:careLocalInput(data.cutoff),sources:{records:records.data.map(row=>({id:row.id,label:`Actividad ${careTimestamp(row.occurred_at)} · revisión ${row.revision}`})),commitments:context.rows.map(c=>({id:c.id,label:`${c.title} · revisión ${careTimestamp(c.review_at)}`,review_at:`Próxima revisión ${careTimestamp(c.review_at)} · ${c.verification_method}`,pending:c.status==="pending"}))}};
}
