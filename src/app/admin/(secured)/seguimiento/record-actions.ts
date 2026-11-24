"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { careEnabled,getCareCapabilities } from "@/lib/care/server";
import { careLocalToUtc } from "@/lib/care/time";
import { recordPayloadFields,recordWriteSchema,validateClinicalPayload,recordReaderSchema } from "@/lib/care/records";
import { careFieldErrors } from "@/lib/care/policy";
import type { Json } from "@/types/database";
import type { CareFormState } from "@/components/care/care-form";
export async function staffRecordAction(_:CareFormState,form:FormData):Promise<CareFormState>{
 try {
  await checkMutationOrigin();await requireAdmin();if(!careEnabled())throw new Error("Registros no habilitados.");const caps=await getCareCapabilities();
  const op=z.enum(["draft","finalize","amend","grant","revoke","receive"]).parse(form.get("intent")??form.get("op"));
  if(!caps.includes(op==="receive"?"care.decisions.manage":"care.records.create"))throw new Error("No tienes permiso para esta acción.");
  const client=await createServerSupabaseClient();
  if(op==="receive"){const request_id=z.uuid().parse(form.get("id"));const result=await client.rpc("care_request_receive",{request_id});if(result.error)throw new Error("Solicitud no disponible.");}
  else if(op==="grant"||op==="revoke"){const p=recordReaderSchema.parse(Object.fromEntries(form.entries()));const result=await client.rpc("care_record_access_manage",{rid:p.id,reader:p.reader,grant_access:op==="grant"});if(result.error)throw new Error("No fue posible cambiar el lector. Revisa autoría y alcance actual.");}
  else {
   const input={...Object.fromEntries(form.entries()),occurred_at:careLocalToUtc(form.get("occurred_at")),request_due_at:form.get("request_due_at")?careLocalToUtc(form.get("request_due_at")):"",confirm_finalize:form.get("confirm_finalize")==="on",confirm_publish:form.get("confirm_publish")==="on",request_intervention:form.get("request_intervention")==="on"};
   const p=recordWriteSchema.parse(input);const final=op!=="draft";
   if(final&&!p.confirm_finalize)return {status:"error",message:"Confirma finalizar el registro.",fieldErrors:{confirm_finalize:["Marca la confirmación."]}};
   if(op==="amend"&&p.reason.length<3)return {status:"error",message:"Explica el motivo de la enmienda.",fieldErrors:{reason:["Motivo requerido."]}};
   if(final&&p.summary_visibility==="patient"&&!p.confirm_publish)return {status:"error",message:"Confirma compartir el resumen.",fieldErrors:{confirm_publish:["Confirmación requerida."]}};
   const fields=recordPayloadFields(p.specialty);const rawPayload=Object.fromEntries(fields.map(f=>[f,form.get(f)??""]));
   if(p.specialty==="recovery")for(const key of ["commitment_due_at","commitment_review_at"])rawPayload[key]=form.get(key)?careLocalToUtc(form.get(key)):"";
   const payload=validateClinicalPayload(p.specialty,rawPayload,final);
   const result=await client.rpc("care_record_write",{op,p:{...p,payload} as Json});
   if(result.error)throw new Error(result.error.code==="40001"?"El registro cambió. Conserva tu texto y recarga antes de guardar.":result.error.code==="23505"?"Ya existe un registro de este tipo para esta sesión y profesional. Ábrelo desde la ficha.":"No fue posible guardar. Revisa sesión realizada, asistencia, permisos, campos y visibilidad.");
   // A new record navigates first: refreshing /nuevo would unmount its action state.
   if(p.version>0)revalidatePath("/admin/seguimiento","layout");revalidatePath("/pacientes","layout");
   return {status:"success",message:final?"Registro finalizado; original conservado.":"Borrador privado guardado.",savedAt:Date.now(),...(p.version===0?{nextPath:`/admin/seguimiento/pacientes/${p.patient_id}/registros/${p.id}`}:{})};
  }
  revalidatePath("/admin/seguimiento","layout");return {status:"success",message:"Cambios guardados.",savedAt:Date.now()};
 }catch(error){if(error instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(error)};return {status:"error",message:error instanceof Error?error.message:"No fue posible guardar."};}
}
