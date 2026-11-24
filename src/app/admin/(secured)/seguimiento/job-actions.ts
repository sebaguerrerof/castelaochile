"use server";
import { careLocalToUtc } from "@/lib/care/time";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireJobs } from "@/lib/care/job-server";
import { careFieldErrors } from "@/lib/care/policy";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import type { CareFormState } from "@/components/care/care-form";
import type { Json } from "@/types/database";
export async function jobAction(_:CareFormState,form:FormData):Promise<CareFormState>{try{
 await checkMutationOrigin();const {client}=await requireJobs();const op=z.enum(["create","pause","resume","run_now","retry","rule","recovery_rule"]).parse(form.get("op"));
 const reason=z.string().trim().min(3).max(600),fields=Object.fromEntries(form.entries());let p:Record<string,unknown>;
 if(op==="recovery_rule"){
 if(form.get("confirm")!=="on")return {status:"error",message:"Confirma la configuración de reiteración.",fieldErrors:{confirm:["Confirmación requerida."]}};
 const optionalNumber=(key:string)=>form.get(key)?z.coerce.number().int().min(1).max(key==="threshold"?100:365).parse(form.get(key)):null;
 p=z.object({patient_id:z.uuid(),previous:z.union([z.uuid(),z.literal("")]),reason,exclusions:z.string().trim().max(600),recipient_id:z.union([z.uuid(),z.literal("")])}).parse(fields);
 p={...p,enabled:form.get("enabled")==="on",confirm:true,threshold:optionalNumber("threshold"),window_days:optionalNumber("window_days"),review_at:form.get("review_at")?careLocalToUtc(form.get("review_at")):null,excluded_commitments:z.array(z.uuid()).max(100).parse(form.getAll("excluded_commitments"))};
 }else if(op==="create"||op==="rule"){
  if(form.get("confirm")!=="on")return {status:"error",message:"Confirma la autorización indicada.",fieldErrors:{confirm:["Confirmación requerida."]}};
  p=op==="create"?z.object({kind:z.enum(["weekly","monthly","operations"]),patient_id:z.union([z.uuid(),z.literal("")]),reason}).parse(fields):z.object({kind:z.enum(["report_omitted","commitment_overdue"]),patient_id:z.uuid(),grace_hours:z.coerce.number().int().min(0).max(168),previous:z.union([z.uuid(),z.literal("")]),reason}).parse(fields);
  p.confirm=true;if(op==="rule")p.enabled=form.get("enabled")==="on";
 }else{p=z.object({id:z.uuid(),version:z.coerce.number().int().positive(),reason,...(op==="retry"?{run_id:z.uuid()}:{})}).parse(fields);}
 const {error}=await client.rpc("care_job_write",{op,p:p as Json});if(error)throw new Error((error.code==="40001"||error.code==="PT409")?"La configuración cambió. Conserva tu texto y recarga.":error.code==="42501"?"El permiso o el alcance cambió.":"No se confirmó el cambio. Revisa campos, confirmación, estado y límites de intentos.");
 revalidatePath("/admin/seguimiento/programaciones");revalidatePath("/admin/seguimiento/alertas");return {status:"success",message:(op==="rule"||op==="recovery_rule")?"Nueva versión de regla registrada; conserva las alertas anteriores.":op==="run_now"||op==="retry"?"Ejecución encolada. El programador privado procesará el intento; consulta su resultado.":"Programación actualizada con alcance explícito.",savedAt:Date.now()};
 }catch(e){if(e instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(e)};return {status:"error",message:e instanceof Error?e.message:"No se confirmó la programación."};}}
