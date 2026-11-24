"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkMutationOrigin,checkLibraryRate,getPatientContext } from "@/lib/patient-library/server";
import { careEnabled } from "@/lib/care/server";
import { careFieldErrors } from "@/lib/care/policy";
import { reportWriteSchema,validateReportAnswers } from "@/lib/care/reports";
import type { CareFormState } from "@/components/care/care-form";
import type { ReportEditorData } from "@/types/care";
import type { Json } from "@/types/database";
export async function patientReportAction(_:CareFormState,form:FormData):Promise<CareFormState> {
  try {
    await checkMutationOrigin();if(!careEnabled())throw new Error("Reportes no habilitados.");
    const {client,user}=await getPatientContext();await checkLibraryRate(`report:${user.id}`);
    const p=reportWriteSchema.parse({...Object.fromEntries(form.entries()),confirm_submit:form.get("confirm_submit")==="on"});
    const submit=form.get("intent")==="submit";
    if(submit&&!p.confirm_submit)return {status:"error",message:"Confirma el envío al equipo.",fieldErrors:{confirm_submit:["Marca la confirmación para enviar."]}};
    const {data,error}=await client.rpc("care_report_editor",{oid:p.obligation_id});if(error||!data)throw new Error("Reporte no disponible.");
    const {obligation,report}=data as unknown as ReportEditorData;
    if(submit&&report&&p.reason.length<3)return {status:"error",message:"Registra un motivo de corrección.",fieldErrors:{reason:["Explica brevemente el cambio."]}};
    const answers=validateReportAnswers(obligation,Object.fromEntries(obligation.fields.map(f=>[f,form.get(f)??""])),submit);
    const result=await client.rpc("care_report_write",{op:submit?"submit":"draft",p:{...p,answers} as Json});
    if(result.error)throw new Error(result.error.code==="40001"?"El reporte o borrador cambió. Conserva tu texto y recarga antes de guardar.":"No fue posible guardar. Conserva tu texto y revisa tu acceso o la ventana del reporte.");
    revalidatePath("/pacientes","layout");revalidatePath("/admin/seguimiento","layout");
    return {status:"success",message:submit?"Reporte enviado al equipo.":"Borrador guardado. Aún no está enviado.",savedAt:Date.now()};
  }catch(error){if(error instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(error)};return {status:"error",message:error instanceof Error?error.message:"No fue posible guardar. Conserva tu texto para reintentar."};}
}
