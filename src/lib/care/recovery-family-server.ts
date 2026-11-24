import "server-only";
import { forbidden,notFound } from "next/navigation";
import { z } from "zod";
import { carePatient,getCareCapabilities,requireCare } from "./server";
import type { AutonomyDetail,AutonomyList,FamilyDetail,FamilyList,Rubric } from "./recovery-family";
export async function recoveryPatient(pid:string,family=false){const context=await carePatient(pid);const caps=await getCareCapabilities();if(!caps.includes("care.records.read")||family&&!caps.includes("care.family.read"))forbidden();return {...context,caps};}
export async function recoveryRubrics(){const {client}=await requireCare("care.records.read");const r=await client.rpc("care_recovery_rubrics");if(r.error)throw new Error("No fue posible leer las rúbricas.");return r.data as unknown as Rubric[];}
export async function autonomyList(pid:string,period:string,page:number){const context=await recoveryPatient(pid);const r=await context.client.rpc("care_autonomy_list",{pid,period,page});if(r.error)throw new Error("No fue posible leer autonomía.");return {...context,data:r.data as unknown as AutonomyList};}
export async function autonomyDetail(pid:string,oid:string){const context=await recoveryPatient(pid);if(!z.uuid().safeParse(oid).success)notFound();const r=await context.client.rpc("care_autonomy_read",{oid});if(r.error||!r.data)notFound();const detail=r.data as unknown as AutonomyDetail;if(detail.observation.patient_id!==pid)notFound();return {...context,detail};}
export async function familyList(pid:string,period:string,page:number){const context=await recoveryPatient(pid,true);const r=await context.client.rpc("care_family_list",{pid,period,page});if(r.error)throw new Error("No fue posible leer seguimiento familiar.");return {...context,data:r.data as unknown as FamilyList};}
export async function familyDetail(pid:string,rid:string){const context=await recoveryPatient(pid,true);if(!z.uuid().safeParse(rid).success)notFound();const r=await context.client.rpc("care_family_read",{rid});if(r.error||!r.data)notFound();const detail=r.data as unknown as FamilyDetail;if(detail.record.patient_id!==pid)notFound();return {...context,detail};}
