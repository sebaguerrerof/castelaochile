"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { careEnabled,getCareCapabilities } from "@/lib/care/server";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reportConfigSchemas,reportReviewSchema } from "@/lib/care/reports";
import { careFieldErrors } from "@/lib/care/policy";
import type { CareFormState } from "@/components/care/care-form";
import type { Json } from "@/types/database";
export async function staffReportAction(_:CareFormState,form:FormData):Promise<CareFormState> {
  try {
    await checkMutationOrigin();await requireAdmin();if(!careEnabled())throw new Error("Reportes no habilitados.");
    const op=z.enum(["rule","enrol","exempt","window","review"]).parse(form.get("op"));const caps=await getCareCapabilities();
    if(!caps.includes(op==="review"?"care.records.create":"care.assignments.manage"))throw new Error("No tienes permiso para esta acción.");
    const input:Record<string,unknown>={...Object.fromEntries(form.entries()),confirm_approved:form.get("confirm_approved")==="on",close_next_day:form.get("close_next_day")==="on"};
    if(op==="rule")for(const key of ["fields","required_fields","weekdays"])input[key]=form.getAll(key);
    const p=(op==="review"?reportReviewSchema:reportConfigSchemas[op]).parse(input) as Json;
    const client=await createServerSupabaseClient();const result=op==="review"?await client.rpc("care_report_write",{op,p}):await client.rpc("care_report_configure",{op,p});
    if(result.error)throw new Error(result.error.code==="40001"?"El registro cambió. Recarga antes de guardar.":"No fue posible guardar. Revisa permisos, fechas, ventana y configuración aprobada.");
    revalidatePath("/admin/seguimiento","layout");revalidatePath("/pacientes","layout");
    return {status:"success",message:op==="review"?"Revisión registrada para esta versión.":"Configuración guardada.",savedAt:Date.now()};
  }catch(error){if(error instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(error)};return {status:"error",message:error instanceof Error?error.message:"No fue posible guardar."};}
}
