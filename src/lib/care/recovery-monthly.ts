import { z } from "zod";
import { recoveryDimensionKeys } from "./recovery-weekly.ts";
export const recoveryMonthlyFields={advances:"Avances y responsabilidades observadas",coverage:"Cobertura y datos insuficientes",difficulties:"Dificultades observadas o informadas",support:"Apoyos que continúan",next_goals:"Próximos objetivos y compromisos"} as const;
const short=z.string().trim().max(600);
export const recoveryMonthlyTextSchema=z.object({advances:short,coverage:short,difficulties:short,support:short,next_goals:short,changes:z.object(Object.fromEntries(recoveryDimensionKeys.map(key=>[key,short]))).strict()}).strict();
export type RecoveryMonthlyText=z.infer<typeof recoveryMonthlyTextSchema>;
export const recoveryMonthlyContextSchema=z.object({eligible:z.boolean(),patient_id:z.uuid().optional(),can_write:z.boolean().optional(),can_review:z.boolean().optional(),recipients:z.array(z.object({id:z.uuid(),label:z.string()})).optional()});
