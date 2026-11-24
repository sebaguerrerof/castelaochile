import "server-only";
import { forbidden,notFound } from "next/navigation";
import { z } from "zod";
import { getCareCapabilities,requireCare } from "./server";
import { informListSchema,informReadSchema } from "./informs";
export async function requireInform(){const context=await requireCare("care.reports.export"),caps=await getCareCapabilities();if(!["care.directory.read","care.patient.read","care.records.read"].every(c=>caps.some(cap=>cap===c)))forbidden();return {...context,caps};}
export async function informRead(rid:string,revision?:number,page=1,full=false){if(!z.uuid().safeParse(rid).success)notFound();const {client}=await requireInform();const {data,error}=await client.rpc("care_inform_read",{rid,...(revision?{rev:revision}:{}),page,full_sources:full});if(error)notFound();return informReadSchema.parse(data);}
export async function informList(page=1){const {client}=await requireInform();const {data,error}=await client.rpc("care_inform_list",{page});if(error)throw new Error("No fue posible cargar los informes autorizados.");return informListSchema.parse(data);}
