import { z } from "zod";
import { informReadSchema } from "./informs";
export const jobKinds={weekly:"Informe semanal · lunes",monthly:"Informe mensual · cierre del mes",operations:"Obligaciones y alertas · cada minuto"} as const;
export const ruleKinds={report_omitted:"Reporte omitido",commitment_overdue:"Compromiso vencido"} as const;
export const jobErrorLabels={permission:"Cambió el permiso o el alcance. Revisa la autorización.",generation:"No se generó el informe. Revisa periodo, fuentes y límites.",database:"La ejecución falló. Revisa el entorno antes de reintentar."} as const;
const integer=z.number().int().nonnegative();
export const jobsReadSchema=z.object({
 jobs:z.array(z.object({id:z.uuid(),owner_id:z.uuid(),owner_label:z.string(),can_control:z.boolean(),kind:z.enum(["weekly","monthly","operations"]),patients:z.array(z.uuid()),scope:z.array(z.object({id:z.uuid(),display_name:z.string()})),enabled:z.boolean(),version:integer,next_due_at:z.string(),reason:z.string()})),
 runs:z.array(z.object({id:z.uuid(),job_id:z.uuid(),job_enabled:z.boolean(),kind:z.enum(["weekly","monthly","operations"]),start_day:z.string(),state:z.enum(["pending","failed","succeeded"]),attempts:integer,next_attempt_at:z.string(),error_code:z.enum(["permission","generation","database"]).nullable(),available_inform_id:z.uuid().nullable(),history:z.array(z.object({attempt:integer,started_at:z.string(),finished_at:z.string(),state:z.enum(["failed","succeeded"]),error_code:z.string().nullable()}))})),
 rules:z.array(z.object({id:z.uuid(),patient_id:z.uuid(),display_name:z.string(),kind:z.enum(["report_omitted","commitment_overdue","recovery_repeated_unfulfilled"]),revision:integer,enabled:z.boolean(),grace_hours:integer,effective_at:z.string(),reason:z.string(),threshold:integer.nullish(),window_days:integer.nullish(),exclusions:z.string().nullish(),excluded_commitments:z.array(z.uuid()).nullish(),recipient_id:z.uuid().nullish(),review_at:z.string().nullish()})),
 scheduler:z.object({registered:z.boolean(),healthy:z.boolean().nullable(),last_finished_at:z.string().nullable(),last_cron_at:z.string().nullable()}),total:integer,total_jobs:integer,rules_total:integer,
});
export type JobsRead=z.infer<typeof jobsReadSchema>;
export const comparisonSchema=z.object({current_start:z.string(),current_end:z.string(),previous_start:z.string(),previous_end:z.string(),revision:integer,population:integer,data_cutoff:z.string(),current_counts:informReadSchema.shape.snapshot.shape.counts,current_quality:informReadSchema.shape.snapshot.shape.quality,previous:informReadSchema.shape.snapshot,current_entries:integer,previous_entries:integer});

export const allRuleKinds={...ruleKinds,recovery_repeated_unfulfilled:"Reiteración Recovery verificada"} as const;
