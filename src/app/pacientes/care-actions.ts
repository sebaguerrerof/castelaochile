"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkMutationOrigin, getPatientContext } from "@/lib/patient-library/server";
import { careEnabled } from "@/lib/care/server";
import { planningSchemas } from "@/lib/care/planning";
import { careLocalToUtc } from "@/lib/care/time";
import { careFieldErrors } from "@/lib/care/policy";
import type { CareFormState } from "@/components/care/care-form";
import type { Json } from "@/types/database";
export async function patientPlanningAction(_:CareFormState,form:FormData):Promise<CareFormState> {
  try {
    await checkMutationOrigin();if(!careEnabled())throw new Error("Planificación no habilitada.");
    const {client,patient}=await getPatientContext();
    const op=z.enum(["plan","plan_complete","commitment","commitment_complete"]).parse(form.get("op"));
    const input:Record<string,unknown>={...Object.fromEntries(form.entries()),patient_id:patient.id,visibility:"patient",confirm_publish:true,source_event_id:"",responsible_id:""};
    for(const key of ["planned_for","due_at"])if(key in input)input[key]=careLocalToUtc(input[key]);
    const p=planningSchemas[op].parse(input) as Json;
    const {error}=await client.rpc("care_planning_manage",{op,p});
    if(error)throw new Error(error.code==="40001"?"El registro cambió. Recarga antes de guardar.":"No fue posible guardar. Comprueba los campos y tu acceso al registro.");
    revalidatePath("/pacientes","layout");revalidatePath("/admin/seguimiento","layout");
    return {status:"success",message:"Guardado en tu planificación.",savedAt:Date.now()};
  }catch(error){if(error instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(error)};return {status:"error",message:error instanceof Error?error.message:"No fue posible guardar."};}
}
