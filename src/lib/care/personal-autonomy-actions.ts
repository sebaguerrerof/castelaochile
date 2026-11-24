"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { personalAutonomyContext } from "./personal-autonomy-server";
import { personalSaveSchema, personalProposalSchema, personalReviewSchema, validatePersonalPayload } from "./personal-autonomy";
import type { CareFormState } from "@/components/care/care-form";
import type { Json } from "@/types/database";

// pid is bound by the staff route; null derives patient identity from the authenticated session.
export async function personalAutonomyAction(pid: string | null, _: CareFormState, form: FormData): Promise<CareFormState> {
  try {
    await checkMutationOrigin();
    const {client, patient, data: context} = await personalAutonomyContext(pid ?? undefined);
    const op = z.enum(["draft", "submit", "propose", "accept", "review", "attest", "observe"]).parse(form.get("op"));
    const raw = z.string().max(180000).parse(form.get("data"));
    let p: unknown;
    try { p = JSON.parse(raw); } catch { return {status: "error", message: "No se pudo leer el formulario. Conserva tus cambios e inténtalo de nuevo."}; }
    if (op === "draft" || op === "submit") {
      const parsed = personalSaveSchema.parse(p);
      const catalog = context.catalogs.find(c => c.id === parsed.catalog_id);
      if (!catalog) throw new Error("Esta versión del instrumento no está disponible.");
      validatePersonalPayload(parsed.payload, catalog, op === "submit");
      p = parsed;
    } else if (op === "propose") p = personalProposalSchema.parse(p);
    else if (op === "review") p = personalReviewSchema.parse(p);
    else if (op === "accept") p = z.object({id: z.uuid(), proposal_id: z.uuid(), confirm: z.literal(true)}).strict().parse(p);
    else if (op === "attest") p = z.object({id: z.uuid(), assessment_id: z.uuid(), revision: z.number().int().positive(), state: z.enum(["discussed", "differences", "pending"]), note: z.string().trim().max(2000), confirm: z.literal(true)}).strict().parse(p);
    else p = z.object({id: z.uuid(), assessment_id: z.uuid(), revision: z.number().int().positive(), body: z.string().trim().min(3).max(2000), shared: z.boolean()}).strict().parse(p);
    const {data: saved, error} = await client.rpc("care_pa_write", {pid: patient.id, op, p: p as Json});
    if (error || !saved) return {status: "error", message: error?.code === "40001" ? "Hay una versión más reciente. Recarga antes de guardar; tus cambios siguen en pantalla." : "No se confirmó el guardado. Revisa los campos, la versión y los permisos. Tus cambios siguen en pantalla."};
    // A wizard must show the acknowledged save before refreshing its versioned
    // server props. Revalidating its layout here would unmount it mid-response.
    // These routes are force-dynamic; the explicit Continue refresh reads the save.
    if (op !== "draft" && op !== "submit") {
      revalidatePath("/pacientes", "layout"); revalidatePath(`/admin/seguimiento/pacientes/${patient.id}`, "layout");
    }
    return {status: "success", message: op === "draft" ? "Borrador guardado en el servidor." : op === "submit" ? "Evaluación enviada. Puedes revisar tus acuerdos y la próxima revisión." : "Guardado confirmado en el servidor.", savedAt: Date.now()};
  } catch (error) {
    if (error instanceof z.ZodError) return {status: "error", message: "Revisa los campos y sus límites antes de guardar."};
    // Never log the submitted payload or return raw database diagnostics.
    return {status: "error", message: error instanceof Error && /^(Faltan|Completa|Responde|La respuesta|Una respuesta|Pregunta ajena|Ítem ajeno|Esta versión)/.test(error.message) ? error.message : "No se confirmó el guardado. Conserva tus cambios y comprueba tu acceso."};
  }
}
