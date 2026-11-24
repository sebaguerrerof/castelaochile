"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CareFormState } from "@/components/care/care-form";
import type { Json } from "@/types/database";
import { careFieldErrors } from "@/lib/care/policy";
import { informRead,requireInform } from "@/lib/care/inform-server";
import { renderInformPdf } from "@/lib/care/inform-pdf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { recoveryMonthlyTextSchema,recoveryMonthlyFields } from "@/lib/care/recovery-monthly";
import { recoveryDimensionKeys } from "@/lib/care/recovery-weekly";
export async function recoveryMonthlyAction(_:CareFormState,form:FormData):Promise<CareFormState>{try{
 await checkMutationOrigin();const {client}=await requireInform();const op=z.enum(["recovery_draft","recovery_deliver","recovery_review"]).parse(form.get("op"));
 const p=z.object({id:z.uuid(),version:z.coerce.number().int().positive(),reason:z.string().trim().min(3).max(600)}).parse(Object.fromEntries(form.entries()));
 const extra:Record<string,unknown>={};
 if(op==="recovery_draft")extra.recovery_text=recoveryMonthlyTextSchema.parse({...Object.fromEntries(Object.keys(recoveryMonthlyFields).map(key=>[key,String(form.get(key)??"")])),changes:Object.fromEntries(recoveryDimensionKeys.map(key=>[key,String(form.get(`changes.${key}`)??"")]))});
 else {extra.confirm=z.literal(true).parse(form.get("confirm")==="on");if(op==="recovery_deliver")extra.recipient_id=z.uuid().parse(form.get("recipient_id"));}
 const result=await client.rpc("care_inform_write",{op,p:{...p,...extra} as Json});if(result.error)throw new Error(result.error.code==="40001"?"El informe cambió; conserva tu texto y recarga.":"No se confirmó la acción mensual. Comprueba texto completo, destinatario autorizado y permisos vigentes.");
 revalidatePath("/admin/seguimiento/informes","layout");return {status:"success",message:op==="recovery_draft"?"Texto mensual guardado en nueva versión; todavía no entregado.":op==="recovery_deliver"?"Entrega confirmada; revisión de Dirección pendiente dentro de Informes.":"Revisión de Dirección registrada en nueva versión; originales conservados.",savedAt:Date.now(),nextPath:`/admin/seguimiento/informes/${result.data}`};
 }catch(error){return error instanceof z.ZodError?{status:"error",message:"Revisa los campos señalados.",fieldErrors:Object.fromEntries(error.issues.map(i=>[i.path.join("."),[i.message]]))}:{status:"error",message:error instanceof Error?error.message:"No fue posible confirmar la acción."};}}
export async function informAction(_:CareFormState,form:FormData):Promise<CareFormState>{try{
 await checkMutationOrigin();const {client}=await requireInform();const op=String(form.get("op"));let p:Record<string,unknown>;
 if(op==="generate"){p=z.object({kind:z.enum(["weekly","monthly"]),start_day:z.iso.date(),patient_id:z.union([z.uuid(),z.literal("")])}).parse(Object.fromEntries(form.entries()));const day=new Date(String(p.start_day)+"T12:00:00Z");if(p.kind==="weekly"&&day.getUTCDay()!==1||p.kind==="monthly"&&day.getUTCDate()!==1)return {status:"error",message:"Revisa el inicio del periodo.",fieldErrors:{start_day:[p.kind==="weekly"?"Selecciona un lunes.":"Selecciona el primer día del mes."]}};
 }else {p=z.object({id:z.uuid(),version:z.coerce.number().int().positive(),reason:z.string().trim().min(3).max(600)}).parse(Object.fromEntries(form.entries()));if(op==="review"){if(form.get("confirm_review")!=="on")return {status:"error",message:"Confirma haber revisado esta versión.",fieldErrors:{confirm_review:["Confirmación requerida."]}};p.confirm_review=true;}}
 const {data,error}=await client.rpc("care_inform_write",{op,p:p as Json});if(error)throw new Error(error.code==="40001"?"El informe cambió. Conserva tu texto y recarga antes de revisar.":error.code==="42501"?"El alcance o los permisos cambiaron.":"No se generó una versión nueva. Revisa periodo cerrado, alcance, permisos y cantidad de fuentes.");
 revalidatePath("/admin/seguimiento/informes","layout");return {status:"success",message:op==="review"?"Revisión registrada en una nueva versión; original conservado.":op==="regenerate"?"Nueva versión generada; pendiente de revisión.":"Informe generado o existente para este alcance y periodo.",savedAt:Date.now(),nextPath:`/admin/seguimiento/informes/${data}`};
 }catch(e){if(e instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(e)};return {status:"error",message:e instanceof Error?e.message:"No fue posible guardar el informe."};}}
export async function informPdfAction(_:CareFormState,form:FormData):Promise<CareFormState>{let ticket:{id:string;token:string;object_key:string}|undefined;let code="render";try{
 await checkMutationOrigin();const p=z.object({id:z.uuid(),revision:z.coerce.number().int().positive()}).parse(Object.fromEntries(form.entries()));const {client}=await requireInform();
 const {data:raw,error}=await client.rpc("care_inform_pdf_begin",{rid:p.id,rev:p.revision});if(error)throw new Error(error.code==="55P03"?"Hay una exportación en curso. Recarga para consultar su resultado.":"No fue posible reservar el PDF. Revisa permisos y los intentos registrados.");
 const reservation=z.object({id:z.uuid(),state:z.string(),token:z.uuid().optional(),object_key:z.string()}).parse(raw);if(reservation.state==="ready")return {status:"success",message:"Esta versión ya tiene un PDF privado verificado.",savedAt:Date.now()};
 ticket=z.object({id:z.uuid(),token:z.uuid(),object_key:z.string()}).parse(reservation);
 const source=await informRead(p.id,p.revision,1,true);const bytes=await renderInformPdf(source);const storage=createAdminSupabaseClient();
 code="upload";const {error:uploadError}=await storage.storage.from("care-informs").upload(ticket.object_key,bytes,{contentType:"application/pdf",upsert:false});if(uploadError)throw new Error("No se confirmó la subida del PDF privado.");
 code="finalize";const {data:ready,error:finishError}=await storage.rpc("care_inform_pdf_finish",{eid:ticket.id,lease:ticket.token,success:true,byte_count:bytes.length,digest:createHash("sha256").update(bytes).digest("hex")});if(finishError||!ready)throw new Error("No se confirmó el PDF; el permiso o el intento puede haber cambiado.");
 revalidatePath(`/admin/seguimiento/informes/${p.id}`);return {status:"success",message:"PDF privado generado y verificado en Storage.",savedAt:Date.now()};
 }catch(e){if(ticket){try {await createAdminSupabaseClient().rpc("care_inform_pdf_finish",{eid:ticket.id,lease:ticket.token,success:false,code});}catch { /* Keep the original export error. */ }}return {status:"error",message:e instanceof Error?e.message:"No se confirmó el PDF. Puedes reintentar sin reemplazar versiones anteriores."};}}
