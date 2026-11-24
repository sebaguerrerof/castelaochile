import { z } from "zod";

export const recoveryActivityLabels = { individual: "Seguimiento individual", sport: "Deporte", weekly_planning: "Planificación semanal", commitment_review: "Revisión de compromisos", group: "Actividad grupal" } as const;
export const recoveryParticipationLabels = { full: "Asistió y participó", partial: "Participación parcial", absent: "No asistió", justified: "Ausencia justificada" } as const;
export const recoverySupportLabels = { constant: "Supervisión constante", frequent: "Recordatorios frecuentes", occasional: "Apoyo ocasional", none: "Sin apoyo", not_observable: "No observable" } as const;
export const recoveryEvidenceLabels = { observed: "Observación directa", plan: "Planificación entregada", task: "Tarea finalizada", patient_report: "Declarado por el paciente", third_party: "Información declarada por otra fuente" } as const;
export const recoveryOutcomeLabels = { pending: "Pendiente", fulfilled: "Cumplido", unfulfilled: "Incumplido", unverifiable: "No verificable" } as const;
export const recoveryActivityFields = ["activity_type", "recovery_participation", "participation_reason", "support", "support_details", "progress", "evidence", "evidence_source", "no_commitment_reason", "recovery_commitment_id", "commitment_title", "commitment_due_at", "commitment_review_at", "commitment_method", "commitment_responsible"] as const;
export const recoveryFieldLabels: Record<string, string> = { activity_type: "Tipo de actividad Recovery", recovery_participation: "Participación en la actividad", participation_reason: "Motivo de participación parcial o ausencia", support: "Apoyo necesario observado", support_details: "Apoyo efectivamente prestado o motivo no observable", progress: "Avances", evidence: "Evidencia y fuente concreta", evidence_source: "Tipo de evidencia", no_commitment_reason: "Motivo por el que no se acordó nuevo compromiso", commitment_title: "Nuevo compromiso", commitment_due_at: "Plazo del compromiso", commitment_review_at: "Próxima revisión del compromiso", commitment_method: "Forma de verificar el compromiso", commitment_responsible: "Responsable del compromiso" };
const short = z.string().trim().max(600);
export function validateRecoveryActivity(payload: Record<string, string>, final: boolean) {
  const data = z.object(Object.fromEntries(recoveryActivityFields.map(key => [key, short]))).parse(payload) as Record<string, string>;
  if (!final) return data;
  const issues: z.core.$ZodIssue[] = [];
  const issue = (key: string, message: string) => issues.push({ code: "custom", path: [key], message, input: data[key] });
  for (const [key, labels] of [["activity_type", recoveryActivityLabels], ["recovery_participation", recoveryParticipationLabels], ["support", recoverySupportLabels], ["evidence_source", recoveryEvidenceLabels]] as const)
    if (!(data[key] in labels)) issue(key, "Selecciona una opción sin preselección.");
  for (const key of ["facts", "progress", "difficulties", "evidence", "support_details"]) if ((payload[key] ?? "").trim().length < 3) issue(key, "Registra el hecho o una constancia expresa de que no fue observable.");
  if (data.recovery_participation !== "full" && data.participation_reason.length < 3) issue("participation_reason", "Explica la participación parcial o ausencia.");
  if (["absent", "justified"].includes(data.recovery_participation) && data.support !== "not_observable") issue("support", "Sin asistencia, el apoyo se registra como no observable.");
  if (data.commitment_title) {
    if (data.commitment_title.length < 3 || data.commitment_title.length > 160) issue("commitment_title", "Describe una tarea de 3 a 160 caracteres.");
    if (!z.uuid().safeParse(data.recovery_commitment_id).success) issue("recovery_commitment_id", "Identificador de compromiso inválido.");
    if (data.commitment_method.length < 3) issue("commitment_method", "Indica cómo se verificará.");
    for (const key of ["commitment_due_at", "commitment_review_at"]) if (!z.iso.datetime({ offset: true }).safeParse(data[key]).success) issue(key, "Fecha requerida.");
    if (!["patient","self"].includes(data.commitment_responsible)) issue("commitment_responsible", "Selecciona responsable.");
    if (data.no_commitment_reason) issue("no_commitment_reason", "Usa un compromiso o su excepción motivada.");
  } else if (data.no_commitment_reason.length < 3) issue("no_commitment_reason", "Si no hubo nuevo compromiso, registra el motivo expresamente.");
  if (issues.length) throw new z.ZodError(issues);
  return data;
}
export function recoveryValueLabel(field: string, value: string) {
  const catalogs: Record<string, Record<string, string>> = { activity_type: recoveryActivityLabels, recovery_participation: recoveryParticipationLabels, support: recoverySupportLabels, evidence_source: recoveryEvidenceLabels, commitment_responsible: {patient: "Paciente", self: "Profesional que registra"} };
  return catalogs[field]?.[value] ?? value;
}
export type RecoveryCommitmentReview = { id: string; commitment_id: string; outcome: keyof typeof recoveryOutcomeLabels; result: string; evidence: string; support: string; difficulties: string; actor_id: string; recorded_at: string; version: number; reason: string };
