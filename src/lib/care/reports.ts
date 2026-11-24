import { z } from "zod";
import { careLocalInput } from "./time.ts";
import type { ReportField, ReportObligation, ReportSlot } from "../../types/care.ts";
export const reportKindLabels={morning:"Mañana",evening:"Noche"} as const;
export const reportFieldLabels:Record<ReportField,string>={state:"Cómo me encuentro (referido por mí)",planning:"Mi planificación de hoy",commitment:"Mi compromiso de hoy",activities:"Actividades que realicé",difficulties:"Dificultades que encontré",tools:"Herramientas que utilicé",next_plan:"Mi planificación siguiente"};
export const reportFields={morning:["state","planning","commitment"],evening:["activities","difficulties","tools","next_plan"]} as const;
export const reportStateLabels:Record<ReportSlot["state"],string>={not_required:"No requerido",configuration_pending:"Configuración pendiente",not_open:"Ventana aún no abierta",data_incomplete:"Datos incompletos",on_time:"Enviado en plazo",late:"Enviado tarde",omitted:"Omitido tras cierre",pending:"Pendiente de envío"};
export const reportQualityLabels:Record<string,string>={outside_enrolment:"Sin incorporación vigente a reportes en este día.",configuration_pending:"Dirección debe configurar los campos y horarios aprobados.",outside_weekdays:"Día fuera del calendario configurado.",explicit_exemption:"Exención registrada por el equipo.",no_active_episode:"Sin episodio activo al abrir esta ventana.",no_expected_agenda:"Sin agenda esperada para este día según la regla.",awaiting_window:"El reporte estará disponible al abrir la ventana.",missing_generation:"No se generó durante la ventana. No se atribuye una omisión al paciente.",invalid_civil_window:"La ventana requiere revisión por cambio horario. No se atribuye incumplimiento.",generated:"Obligación generada dentro de su ventana."};
export function reportDay(value?:string,now=new Date()) {
  const today=careLocalInput(now).slice(0,10);
  const parsed=z.iso.date().safeParse(value);
  return parsed.success&&parsed.data<=today?parsed.data:today;
}
const day=z.iso.date();const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);const id=z.uuid();
const reason=z.string().trim().min(3).max(300);const version=z.coerce.number().int().min(0);
export const reportConfigSchemas={
  rule:z.object({kind:z.enum(["morning","evening"]),effective_on:day,opens_local:time,closes_local:time,close_next_day:z.boolean(),basis:z.enum(["active_days","agenda_days"]),weekdays:z.array(z.coerce.number().int().min(1).max(7)).min(1).max(7),fields:z.array(z.enum(Object.keys(reportFieldLabels) as [ReportField,...ReportField[]])).min(1).max(4),required_fields:z.array(z.enum(Object.keys(reportFieldLabels) as [ReportField,...ReportField[]])).max(4),confirm_approved:z.literal(true),reason}).superRefine((p,ctx)=>{
    if((p.close_next_day?p.closes_local>p.opens_local:p.closes_local<=p.opens_local))ctx.addIssue({code:"custom",message:"La ventana debe ser mayor que cero y como máximo un día civil.",path:["closes_local"]});
    if(p.fields.some(f=>!(reportFields[p.kind] as readonly string[]).includes(f))||p.required_fields.some(f=>!p.fields.includes(f)))ctx.addIssue({code:"custom",message:"Selecciona campos del tipo y requeridos incluidos.",path:["fields"]});
  }),
  enrol:z.object({patient_id:id,starts_on:day,ends_on:z.union([day,z.literal("")]),version,reason}),
  exempt:z.object({patient_id:id,kind:z.enum(["morning","evening","both"]),starts_on:day,ends_on:day,reason}),
  window:z.object({patient_id:id,kind:z.enum(["morning","evening"]),starts_on:day,ends_on:day,opens_local:time,closes_local:time,close_next_day:z.boolean(),reason}),
};
export function validateReportAnswers(o:Pick<ReportObligation,"fields"|"required_fields">,answers:Record<string,unknown>,submit:boolean) {
  const shape=Object.fromEntries(o.fields.map(f=>[f,submit&&o.required_fields.includes(f)?z.string().trim().min(1).max(600):z.string().trim().max(600)]));
  return z.strictObject(shape).parse(answers) as Record<ReportField,string>;
}
export const reportWriteSchema=z.object({obligation_id:id,report_version:version,draft_version:version,submission_key:id,reason:z.string().trim().max(300),confirm_submit:z.boolean()});
export const reportReviewSchema=z.object({obligation_id:id,report_version:version,comment:z.string().trim().max(600)});
