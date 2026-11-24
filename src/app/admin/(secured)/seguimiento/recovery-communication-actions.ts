"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireCare } from "@/lib/care/server";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { recoveryCommunicationSchema } from "@/lib/care/recovery-communication";
import { careFieldErrors } from "@/lib/care/policy";
import { careLocalToUtc } from "@/lib/care/time";
import type { CareFormState } from "@/components/care/care-form";
export async function recoveryCommunicationAction(_:CareFormState,form:FormData):Promise<CareFormState>{try{
 await checkMutationOrigin();const {client}=await requireCare("care.records.create");
 if(form.get("confirm")!=="on")return {status:"error",message:"Confirma que la comunicación ya ocurrió.",fieldErrors:{confirm:["Una solicitud no acredita comunicación realizada."]}};
 const p=recoveryCommunicationSchema.parse({...Object.fromEntries(form.entries()),occurred_at:careLocalToUtc(form.get("occurred_at")),confirm:true});
 const {error}=await client.rpc("care_rc_communication_write",{p});if(error)throw new Error((error.code==="40001"||error.code==="PT409")?"La constancia cambió. Conserva tu texto y recarga.":"No se guardó. Revisa fecha pasada, destinatario, permiso y alcance.");
 revalidatePath("/admin/seguimiento","layout");return {status:"success",message:"Comunicación realizada registrada; versiones anteriores conservadas.",savedAt:Date.now()};
 }catch(e){if(e instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(e)};return {status:"error",message:e instanceof Error?e.message:"No se guardó la constancia."};}}
