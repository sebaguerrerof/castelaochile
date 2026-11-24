import "server-only";
import { forbidden,notFound } from "next/navigation";
import { z } from "zod";
import { carePatient,getCareCapabilities } from "./server";
import type { RecordDetail } from "@/types/care";
export async function recordPatient(pid:string){const context=await carePatient(pid);const caps=await getCareCapabilities();if(!caps.includes("care.records.read")&&!caps.includes("care.records.create"))forbidden();return {...context,caps};}
export async function recordDetail(pid:string,rid:string){
 if(!z.uuid().safeParse(rid).success)notFound();const context=await recordPatient(pid);
 const result=await context.client.rpc("care_record_read",{rid});if(result.error||!result.data)notFound();const detail=result.data as unknown as RecordDetail;
 if(detail.record.patient_id!==pid)notFound();return {...context,detail};
}
