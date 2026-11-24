import type { AdminRole } from "../types/database.ts";
import type { CareCapability } from "../types/care.ts";

export const staffRoles = ["superadmin", "psychologist", "psychiatrist", "recovery_coach", "editor", "viewer"] as const;
export const staffRoleLabels: Record<AdminRole, string> = {
  superadmin: "Dirección · Superadministrador",
  psychologist: "Psicólogo",
  psychiatrist: "Psiquiatra",
  recovery_coach: "Coach Recovery",
  editor: "Editor del sitio web",
  viewer: "Solo lectura del sitio web",
};
export const staffRoleDescriptions: Record<AdminRole, string> = {
  superadmin: "Administra todo el centro: pacientes, equipo, fichas, informes y sitio web.",
  psychologist: "Trabaja con sus pacientes asignados, sesiones, seguimiento y registros psicológicos.",
  psychiatrist: "Trabaja con sus pacientes asignados, consultas e indicaciones psiquiátricas.",
  recovery_coach: "Trabaja con sus pacientes asignados, actividades, compromisos y revisiones Recovery.",
  editor: "Administra el contenido del sitio web; no obtiene acceso clínico por este rol.",
  viewer: "Consulta el sitio web; no obtiene acceso clínico por este rol.",
};
export const isClinicalRole = (role: AdminRole) => ["superadmin", "psychologist", "psychiatrist", "recovery_coach"].includes(role);
const base: CareCapability[] = ["care.directory.read", "care.patient.read", "care.records.create", "care.records.read", "care.alerts.review"];
export function roleCareCapabilities(role: AdminRole): CareCapability[] {
  if (role === "superadmin") return [...base, "care.assignments.manage", "care.medical.create", "care.family.read", "care.decisions.manage", "care.reports.export"];
  if (role === "psychiatrist") return [...base, "care.medical.create"];
  if (role === "psychologist" || role === "recovery_coach") return [...base];
  return [];
}
