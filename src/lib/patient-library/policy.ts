import { z } from "zod";
import type { LibraryCapability, LibraryPermissions } from "../../types/patient-library.ts";

export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
export const materialKinds = { activity: "Actividad", guide: "Guía", summary: "Resumen", report: "Informe", exercise: "Ejercicio", other: "Otro" } as const;
export function hasLibraryCapability(p: LibraryPermissions | null, cap: LibraryCapability) {
  return Boolean(p && (cap === "access" ? p.manage_access : cap === "content" ? p.manage_content : p.read_content || p.manage_content));
}
export function internalPatientDestination(value: unknown, fallback = "/pacientes") {
  return typeof value === "string" && /^\/pacientes(?:\/[a-zA-Z0-9/-]*)?$/.test(value) && !value.includes("//") ? value : fallback;
}
export function sameOrigin(origin: string | null, expected: string) {
  try { return origin !== null && new URL(origin).origin === new URL(expected).origin; } catch { return false; }
}
export const uuid = z.uuid();
export const materialSchema = z.object({
  id: z.union([uuid, z.literal("")]), version: z.coerce.number().int().min(0),
  title: z.string().trim().min(3).max(160), description: z.string().trim().max(600),
  area_id: uuid, folder_id: z.union([uuid,z.literal("")]), kind: z.enum(["activity","guide","summary","report","exercise","other"]),
  body: z.string().max(100000), tags: z.array(z.string().trim().min(1).max(40)).max(20),
  session_date: z.union([z.iso.date(),z.literal("")]), audience: z.enum(["all","groups","patients"]),
  patients: z.array(uuid).max(500), groups: z.array(uuid).max(100),
  status: z.enum(["draft","published","archived"]), confirm_audience: z.boolean(), confirm_publish: z.boolean(),
}).superRefine((v,ctx) => {
  if (v.kind === "report" && (v.audience !== "patients" || v.patients.length !== 1)) ctx.addIssue({code:"custom",message:"Un informe requiere exactamente un paciente.",path:["patients"]});
  if (v.audience === "groups" && !v.groups.length || v.audience === "patients" && !v.patients.length) ctx.addIssue({code:"custom",message:"Selecciona destinatarios.",path:["audience"]});
  if (v.audience !== "patients" && v.patients.length || v.audience !== "groups" && v.groups.length) ctx.addIssue({code:"custom",message:"Los destinatarios no coinciden con la audiencia.",path:["audience"]});
});
const param = (v: unknown) => typeof v === "string" ? v : "";
export function searchFilters(values: Record<string,string | string[] | undefined>) {
  const optionalUuid = (v: unknown) => uuid.safeParse(v).success ? String(v) : undefined;
  const optionalDate = (v: unknown) => z.iso.date().safeParse(v).success ? String(v) : undefined;
  const kind = param(values.tipo);
  const n = Number(values.pagina);
  return { q: param(values.q).trim().slice(0,120), area: optionalUuid(values.area), folder: optionalUuid(values.carpeta),
    kind_filter: kind in materialKinds ? kind : undefined, date_from: optionalDate(values.desde), date_to: optionalDate(values.hasta),
    page: Number.isInteger(n) && n>0 ? Math.min(n,10000) : 1 };
}
