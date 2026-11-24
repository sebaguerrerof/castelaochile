"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { requireCare,getCareCapabilities } from "@/lib/care/server";
import { assessmentSchema,alertActionSchema } from "@/lib/care/dashboard";
import { careLocalToUtc } from "@/lib/care/time";
import { careFieldErrors } from "@/lib/care/policy";
import type { CareFormState } from "@/components/care/care-form";
export async function followupAction(_:CareFormState,form:FormData):Promise<CareFormState>{
 try{
  await checkMutationOrigin();const {client}=await requireCare("care.alerts.review");const caps=await getCareCapabilities();if(!caps.includes("care.patient.read")||!caps.includes("care.records.read"))throw new Error("Acción no disponible.");
  const op=z.enum(["assessment","receive","resolve"]).parse(form.get("intent")??form.get("op"));
  const values=Object.fromEntries(form.entries());
  const p=op==="assessment"?assessmentSchema.parse({...values,occurred_at:careLocalToUtc(form.get("occurred_at")),review_at:careLocalToUtc(form.get("review_at")),confirm_approved:form.get("confirm_approved")==="on"}):alertActionSchema.parse(values);
  const result=await client.rpc("care_followup_manage",{op,p});if(result.error)throw new Error(result.error.code==="40001"?"El seguimiento cambió. Conserva tu texto y recarga antes de guardar.":"No fue posible guardar. Revisa alcance, evidencia, fechas y estado actual.");
  revalidatePath("/admin/seguimiento","layout");return {status:"success",message:op==="assessment"?"Valoración manual guardada; historial conservado.":op==="receive"?"Recepción registrada; la alerta continúa pendiente de resolución.":"Resolución registrada; origen e historial conservados.",savedAt:Date.now()};
 }catch(error){if(error instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(error)};return {status:"error",message:error instanceof Error?error.message:"No fue posible guardar."};}
}
