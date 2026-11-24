"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Json } from "@/types/database";
import type { CareFormState } from "@/components/care/care-form";
import { requireCare } from "@/lib/care/server";
import { requireDirection } from "@/lib/care/decision-server";
import { decisionWriteSchema,taskWriteSchema } from "@/lib/care/decisions";
import { careFieldErrors } from "@/lib/care/policy";
import { careLocalToUtc } from "@/lib/care/time";
import { checkMutationOrigin } from "@/lib/patient-library/server";
const local=(form:FormData,name:string)=>form.get(name)?careLocalToUtc(form.get(name)):"";
export async function decisionAction(_:CareFormState,form:FormData):Promise<CareFormState>{
 try{
  await checkMutationOrigin();const op=String(form.get("intent")??form.get("op"));const {client}=await requireDirection();let p:Record<string,unknown>;
  if(op==="decision_draft"||op==="decision_final"){
   p=decisionWriteSchema.parse({...Object.fromEntries(form.entries()),planned_at:local(form,"planned_at"),review_at:local(form,"review_at"),confirm_final:form.get("confirm_final")==="on"});
   if(op==="decision_final"){
    const errors:Record<string,string[]>={};for(const f of ["situation","evaluation","decision"]){if(String(p[f]).length<3)errors[f]=["Describe este campo brevemente."];}
    if(!p.responsible_id)errors.responsible_id=["Selecciona responsable de dirección."];
    if(!p.planned_at)errors.planned_at=["Indica fecha prevista."];
    if(!p.review_at||Date.parse(String(p.review_at))<=Date.now())errors.review_at=["Indica la próxima revisión en el futuro."];
    if(!p.confirm_final)errors.confirm_final=["Confirma registrar la decisión."];
    if(Object.keys(errors).length)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:errors};
   }
  }else {p=z.object({id:z.uuid(),patient_id:z.uuid(),version:z.coerce.number().int().positive(),reason:z.string().trim().min(3).max(600),result:z.string().trim().max(600)}).parse({...Object.fromEntries(form.entries()),result:form.get("result")??""});}
  const {error}=await client.rpc("care_decision_write",{op,p:p as Json});if(error)throw new Error((error.code==="40001"||error.code==="PT409")?"La decisión cambió. Conserva tu texto y recarga antes de guardar.":error.code==="23505"?"La solicitud ya tiene una decisión; consulta el listado.":"No fue posible guardar. Revisa las tareas pendientes, permisos, fuentes y fechas.");
  if(p.version!==0)revalidatePath("/admin/seguimiento","layout");
  return {status:"success",message:op==="decision_draft"?"Borrador privado guardado.":op==="decision_close"?"Decisión cerrada con resultado.":op==="decision_cancel"?"Decisión cancelada; tareas pendientes retiradas.":"Decisión registrada; revisión original conservada.",savedAt:Date.now(),...(p.version===0?{nextPath:`/admin/seguimiento/pacientes/${p.patient_id}/decisiones/${p.id}`}:{})};
 }catch(e){if(e instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(e)};return {status:"error",message:e instanceof Error?e.message:"No fue posible guardar."};}
}
export async function taskAction(_:CareFormState,form:FormData):Promise<CareFormState>{
 try{
  await checkMutationOrigin();const op=String(form.get("intent")??form.get("op"));const {client}=await requireCare("care.patient.read");let p:Record<string,unknown>;
  if(op==="task_save")p=taskWriteSchema.parse({...Object.fromEntries(form.entries()),due_at:local(form,"due_at")});
  else p=z.object({id:z.uuid(),version:z.coerce.number().int().positive(),reason:z.string().trim().max(300),result:z.string().trim().max(600)}).parse({...Object.fromEntries(form.entries()),reason:form.get("reason")??"",result:form.get("result")??""});
  if(op==="task_report"&&String(p.result).length<3)return {status:"error",message:"Registra el resultado de la ejecución.",fieldErrors:{result:["Resultado requerido."]}};
  if(["task_verify","task_return","task_cancel"].includes(op)&&String(p.reason).length<3)return {status:"error",message:"Explica la revisión visible al responsable.",fieldErrors:{reason:["Motivo requerido."]}};
  const {error}=await client.rpc("care_task_write",{op,p:p as Json});if(error)throw new Error((error.code==="40001"||error.code==="PT409")?"La tarea cambió. Conserva tu texto y recarga antes de guardar.":"No fue posible guardar. Revisa responsable vigente, agenda, estado y permisos.");
  revalidatePath("/admin/seguimiento","layout");return {status:"success",message:op==="task_report"?"Resultado informado; pendiente de verificación de dirección.":op==="task_verify"?"Resultado verificado; tarea completada.":"Cambio de tarea guardado.",savedAt:Date.now()};
 }catch(e){if(e instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(e)};return {status:"error",message:e instanceof Error?e.message:"No fue posible guardar."};}
}
