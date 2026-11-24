import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { careEnabled, carePatient } from "./server";
import { getPatientContext } from "@/lib/patient-library/server";
import { personalCatalogSchema, type PersonalContext } from "./personal-autonomy";

export async function personalAutonomyContext(pid?: string) {
  if (!careEnabled()) notFound();
  if (pid && !z.uuid().safeParse(pid).success) notFound();
  const context = pid ? await carePatient(pid) : await getPatientContext();
  const {data, error} = await context.client.rpc("care_pa_context", {pid: context.patient.id});
  if (error) throw new Error("No fue posible cargar autonomía y acuerdos. Comprueba la migración local y tu acceso.");
  const result = data as unknown as PersonalContext;
  result.catalogs = z.array(personalCatalogSchema).parse(result.catalogs);
  return {...context, data: result};
}
