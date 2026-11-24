import { z } from "zod";
import type { CareCapability } from "../../types/care.ts";
export const capabilityLabels: Record<CareCapability,string> = {
  "care.directory.read":"Ver pacientes asignados", "care.patient.read":"Leer ficha compartida",
  "care.assignments.manage":"Coordinar asignaciones y episodios", "care.records.create":"Crear registros profesionales",
  "care.records.read":"Leer coordinación y reservas autorizadas", "care.medical.create":"Registrar indicaciones médicas",
  "care.family.read":"Leer terceros con concesión explícita", "care.alerts.review":"Revisar alertas",
  "care.decisions.manage":"Gestionar decisiones de dirección", "care.reports.export":"Exportar informes autorizados",
};
export const careCapabilities=Object.keys(capabilityLabels) as CareCapability[];
export const specialtyLabels={direction:"Dirección",psychology:"Psicología",recovery:"Recovery",psychiatry:"Psiquiatría"} as const;
export const careStatusLabels={active:"Activo",paused:"Pausado",discharged:"Egresado",withdrawn:"Abandono"} as const;
export const hasCareCapability=(caps:readonly CareCapability[]|null|undefined,cap:CareCapability)=>Boolean(caps?.includes(cap));
const id=z.uuid();
const instant=z.iso.datetime({offset:true}).refine(v=>Number.isFinite(Date.parse(v)),"Fecha inválida");
const phase=z.union([id,z.literal("")]);
export const careSchemas={
  capabilities:z.object({user_id:id,capabilities:z.array(z.enum(careCapabilities as [CareCapability,...CareCapability[]])).max(careCapabilities.length)}),
  assignment:z.object({patient_id:id,professional_id:id,specialty:z.enum(["direction","psychology","recovery","psychiatry"]),starts_at:instant}),
  assignment_end:z.object({id}),
  phase:z.object({id:phase,label:z.string().trim().min(2).max(80),is_active:z.boolean()}),
  episode:z.object({patient_id:id,started_at:instant,phase_id:phase,reason:z.string().trim().min(3).max(300)}),
  episode_change:z.object({id,version:z.coerce.number().int().positive(),status:z.enum(["active","paused","discharged","withdrawn"]),phase_id:phase,effective_at:instant,reason:z.string().trim().min(3).max(300)}),
};
export function carePage(value:unknown) {const n=Number(value);return Number.isInteger(n)&&n>0?Math.min(n,10000):1;}
export function careFieldErrors(error:z.ZodError) {
  const fields=z.flattenError(error).fieldErrors;
  return Object.fromEntries(Object.keys(fields).map(field=>[field,[field==="patients"?"Selecciona participantes autorizados.":"Revisa el valor y los límites de este campo."]]));
}
