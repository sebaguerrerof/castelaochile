import { z } from "zod";

// These labels come from the user's instructions. Item wording must come from the source pages.
export const personalAreas = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export const personalScale = ["Dependencia alta", "Apoyo constante", "Apoyo ocasional", "Autonomía habitual", "Autonomía total"] as const;
export const personalCategories = ["Sí", "No", "A veces"] as const;
export const personalOutcomes = ["Cumplida", "Parcialmente cumplida", "No cumplida en este periodo", "Reformulada / pausada", "No evaluable"] as const;
const text = z.string().trim().max(2000);
const id = z.uuid();
export const personalCatalogSchema = z.object({
  id, document_version: z.string(), transcription_state: z.enum(["pending_source", "verified"]),
  title: z.string(), instructions: z.string(), source_manifest: z.array(z.object({page: z.number().int().min(1).max(5), sha256: z.string().regex(/^[a-f0-9]{64}$/)})),
  perspective_instructions: z.string(), agreement_instructions: z.string(), review_instructions: z.string(), closing_text: z.string(), outcome_criteria: z.array(z.string()).length(5),
  scale_descriptions: z.array(z.object({value: z.number().int().min(0).max(4), description: z.string()})),
  areas: z.array(z.object({key: z.enum(personalAreas), title: z.string(), instructions: z.string(), items: z.array(z.object({id: z.string().regex(/^[A-H][a-zA-Z0-9_-]{1,39}$/), text: z.string().min(1)}))})),
  questions: z.array(z.object({id: z.string(), section: z.enum(["initial", "perspective", "learning"]), text: z.string().min(1)})),
});
export type PersonalCatalog = z.infer<typeof personalCatalogSchema>;
export const personalAnswerSchema = z.object({value: z.union([z.number().int().min(0).max(4), z.enum(personalCategories), z.null()]), context: text, missing_reason: text}).strict();
export const personalPayloadSchema = z.object({
  evaluation_date: z.iso.date(), coach_id: id.nullable(), meeting_day: z.string().trim().max(80),
  review_frequency: z.string().trim().max(120), next_review: z.iso.date().nullable(),
  answers: z.record(z.string(), personalAnswerSchema), open_answers: z.record(z.string(), text), additional_notes: text,
}).strict();
export type PersonalPayload = z.infer<typeof personalPayloadSchema>;
export function validatePersonalPayload(value: unknown, catalog: PersonalCatalog, final = false) {
  const p = personalPayloadSchema.parse(value);
  const items = catalog.areas.flatMap(a => a.items.map(item => ({...item, area: a.key})));
  for (const [key, answer] of Object.entries(p.answers)) {
    const item = items.find(i => i.id === key);
    if (!item) throw new Error("Ítem ajeno a esta versión del instrumento.");
    if (answer.value !== null && (item.area <= "F" ? typeof answer.value !== "number" : !personalCategories.includes(answer.value as typeof personalCategories[number]))) throw new Error("La respuesta no corresponde a la escala del área.");
    if (answer.value !== null && answer.missing_reason) throw new Error("Una respuesta y la falta de información son estados separados.");
  }
  if (Object.keys(p.open_answers).some(key => !catalog.questions.some(q => q.id === key && q.section !== "learning"))) throw new Error("Pregunta ajena a esta evaluación.");
  if (final) {
    if (catalog.transcription_state !== "verified" || catalog.source_manifest.length !== 5 || catalog.areas.length !== 8 || catalog.areas.some(a => !a.items.length)) throw new Error("Faltan las cinco páginas y su transcripción verificada. Puedes guardar un borrador.");
    if (!p.coach_id || !p.meeting_day || !p.review_frequency) throw new Error("Completa coach, día de reunión y periodicidad acordada.");
    if (items.some(i => !p.answers[i.id] || (p.answers[i.id].value === null && p.answers[i.id].missing_reason.length < 3))) throw new Error("Responde cada ítem o indica por qué falta información.");
    if (catalog.questions.some(q => q.section !== "learning" && !p.open_answers[q.id]?.trim())) throw new Error("Completa las preguntas abiertas.");
  }
  return p;
}
export const personalSaveSchema = z.object({id, catalog_id: id, version: z.number().int().nonnegative(), baseline_id: id.nullable(), mode: z.enum(["self", "assisted"]), patient_present: z.boolean(), reason: z.string().trim().min(3).max(300), confirm: z.boolean(), payload: personalPayloadSchema}).strict();
export const personalProposalSchema = z.object({
  id, assessment_id: id, assessment_revision: z.number().int().positive(), area: z.enum(personalAreas), item_id: z.string().max(40),
  description: z.string().trim().min(3).max(160), responsible_kind: z.enum(["patient", "professional"]), responsible_id: id.nullable(),
  due_at: z.iso.datetime({offset: true}).nullable(), frequency: z.string().trim().max(120), review_at: z.iso.datetime({offset: true}),
  verification: z.string().trim().min(3).max(600), difficulty: text, contingency: text, existing_commitment_id: id.nullable(),
}).strict().refine(p => (p.responsible_kind === "patient") === (p.responsible_id === null), "Selecciona el responsable.");
export const personalReviewSchema = z.object({id, proposal_id: id, supersedes: id.nullable(), review_date: z.iso.date(), period_start: z.iso.date(), period_end: z.iso.date(), outcome: z.enum(personalOutcomes), result: z.string().trim().min(3).max(2000), evidence: z.string().trim().min(3).max(2000), support: text, next_step: z.string().trim().min(3).max(2000), learning: z.record(z.string(), text), shared: z.boolean(), reason: z.string().trim().min(3).max(300)}).strict().refine(p => p.period_start <= p.period_end, "El periodo no es válido.");
export function personalResponseLabel(value: z.infer<typeof personalAnswerSchema>["value"] | undefined) {
  return value == null ? "Sin información" : typeof value === "number" ? `${value} · ${personalScale[value]}` : value;
}
export function personalSectionProgress(p: PersonalPayload, catalog: PersonalCatalog) {
  return {answered: catalog.areas.filter(a => a.items.length > 0 && a.items.every(i => p.answers[i.id]?.value != null)).length, total: 8};
}
export type PersonalAssessment = {id: string; catalog_id: string; baseline_id: string | null; revision: number; status: "draft" | "submitted"; respondent_patient_id: string; entered_by: string; mode: "self" | "assisted"; recorded_at: string; reason: string; payload: PersonalPayload};
export type PersonalProposal = z.infer<typeof personalProposalSchema> & {origin: "patient" | "coach"; proposed_by: string; created_at: string; patient_accepted_by: string | null; coach_accepted_by: string | null; commitment_id: string | null};
export type PersonalReview = z.infer<typeof personalReviewSchema> & {actor_id: string; actor_kind: "patient" | "coach"; recorded_at: string};
export type PersonalAgreementSnapshot = {id: string; commitment_id: string | null; patient_accepted_by: string | null; coach_accepted_by: string | null}[];
export function personalAgreementSignature(rows: PersonalAgreementSnapshot) {
  // JSONB does not preserve object-key order; compare canonical domain fields.
  return JSON.stringify(rows.map(p => ({id:p.id,commitment_id:p.commitment_id,patient_accepted_by:p.patient_accepted_by,coach_accepted_by:p.coach_accepted_by})).sort((a,b) => a.id.localeCompare(b.id)));
}
export type PersonalContext = {catalogs: PersonalCatalog[]; assessments: PersonalAssessment[]; proposals: PersonalProposal[]; reviews: PersonalReview[]; attestations: {id: string; assessment_id: string; revision: number; actor_id: string; party: "patient" | "coach"; state: "discussed" | "differences" | "pending"; note: string; recorded_at: string; agreement_snapshot: PersonalAgreementSnapshot}[]; observations: {id: string; assessment_id: string; revision: number; actor_id: string; body: string; shared: boolean; recorded_at: string}[]; can_write: boolean; actor_id: string; patient_actor_id: string | null; coach_ids: string[]; patient_mode: boolean; actors: {id: string; label: string}[]};
