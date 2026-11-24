"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { careEnabled, getCareCapabilities } from "@/lib/care/server";
import { careFieldErrors, careSchemas } from "@/lib/care/policy";
import { careLocalToUtc } from "@/lib/care/time";
import type { Json } from "@/types/database";
import type { CareFormState } from "@/components/care/care-form";

export async function manageCare(_:CareFormState,form:FormData):Promise<CareFormState> {
  try {
    await checkMutationOrigin();
    await requireAdmin();if(!careEnabled())throw new Error("Seguimiento no habilitado en este entorno.");
    const op=z.enum(["assignment","assignment_end","phase","episode","episode_change"]).parse(form.get("op"));
    if(!(await getCareCapabilities()).includes("care.assignments.manage"))throw new Error("No tienes permiso para esta acción.");
    const input:Record<string,unknown>=Object.fromEntries(form.entries());
    if(op==="phase")input.is_active=form.get("is_active")==="on";
    for(const key of ["starts_at","started_at","effective_at"])if(key in input)input[key]=careLocalToUtc(input[key]);
    const p=careSchemas[op].parse(input) as Json;
    const client=await createServerSupabaseClient();const {error}=await client.rpc("care_manage",{op,p});
    if(error)throw new Error(error.code==="40001"?"El registro cambió. Recarga antes de guardar.":"No fue posible guardar. Revisa los datos y la asignación del profesional.");
    revalidatePath("/admin/seguimiento","layout");revalidatePath("/pacientes","layout");
    return {status:"success",message:"Cambios guardados.",savedAt:Date.now()};
  } catch(error) {
    if(error instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(error)};
    return {status:"error",message:error instanceof Error?error.message:"No fue posible guardar."};
  }
}
