import "server-only";
import { forbidden,notFound } from "next/navigation";
import { requireInform } from "./inform-server";
import { jobsReadSchema,comparisonSchema } from "./jobs";
export async function requireJobs(){const context=await requireInform();if(!context.caps.includes("care.decisions.manage"))forbidden();return context;}
export async function jobRead(page=1,team=false,kind="all",state="all"){const {client}=await requireJobs();const {data,error}=await client.rpc("care_job_filtered",{page,team,kind_filter:kind,state_filter:state});if(error)throw new Error("No fue posible cargar las programaciones autorizadas.");return jobsReadSchema.parse(data);}
export async function ruleContext(patients:string[]){const {client,caps}=await requireJobs();if(!caps.includes("care.alerts.review"))forbidden();const {data,error}=await client.rpc("care_rule_context",{patients});if(error)throw new Error("No fue posible verificar las reglas vigentes.");return jobsReadSchema.shape.rules.parse(data);}
export async function informCompare(rid:string,revision?:number,page=1){const {client}=await requireInform();const {data,error}=await client.rpc("care_inform_compare",{rid,...(revision?{rev:revision}:{}),page});if(error)notFound();return comparisonSchema.parse(data);}
