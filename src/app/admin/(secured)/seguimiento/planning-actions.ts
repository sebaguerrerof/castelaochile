"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { careEnabled, getCareCapabilities } from "@/lib/care/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { planningSchemas } from "@/lib/care/planning";
import { careLocalToUtc } from "@/lib/care/time";
import { careFieldErrors } from "@/lib/care/policy";
import type { CareFormState } from "@/components/care/care-form";
import type { Json } from "@/types/database";
export async function staffPlanningAction(_:CareFormState,form:FormData):Promise<CareFormState> {
  try {
    await checkMutationOrigin();await requireAdmin();
    if(!careEnabled()||!(await getCareCapabilities()).includes("care.records.create"))throw new Error("No tienes permiso para esta acción.");
    const op=z.enum(["event","event_close","attendance","commitment","commitment_complete","commitment_verify","goals"]).parse(form.get("op"));
    const input:Record<string,unknown>=Object.fromEntries(form.entries());
    if(op==="event")input.patients=form.getAll("patients");
    input.confirm_publish=form.get("confirm_publish")==="on";
    for(const key of ["starts_at","ends_at","due_at"])if(key in input)input[key]=careLocalToUtc(input[key]);
    const p=planningSchemas[op].parse(input) as Json;
    const client=await createServerSupabaseClient();const {error}=await client.rpc("care_planning_manage",{op,p});
    if(error)throw new Error((error.code==="40001"||error.code==="PT409")?"El registro cambió. Recarga antes de guardar.":"No fue posible guardar. Revisa fechas, permisos, asistencia y vínculos existentes.");
    revalidatePath("/admin/seguimiento","layout");revalidatePath("/pacientes","layout");
    return {status:"success",message:"Cambios guardados.",savedAt:Date.now()};
  }catch(error){if(error instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(error)};return {status:"error",message:error instanceof Error?error.message:"No fue posible guardar."};}
}
