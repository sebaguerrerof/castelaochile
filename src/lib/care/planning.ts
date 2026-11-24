import { z } from "zod";
export const eventKindLabels={group:"Terapia grupal",individual:"Sesión individual",recovery:"Recovery",sport:"Deporte",family:"Sesión familiar",psychiatry:"Control de psiquiatría"} as const;
export const eventStatusLabels={scheduled:"Programada",completed:"Realizada",cancelled:"Cancelada"} as const;
export const attendanceLabels={pending:"Pendiente de registro",present:"Presente",absent:"Ausente",justified:"Justificada"} as const;
export const planStatusLabels={planned:"Planificada",completed:"Realizada según tu reporte",cancelled:"Cancelada"} as const;
const id=z.uuid(), optionalId=z.union([id,z.literal("")]),version=z.coerce.number().int().min(0),instant=z.iso.datetime({offset:true});
const title=z.string().trim().min(3).max(160),reason=z.string().trim().min(3).max(300);
export const planningSchemas={
  event:z.object({id,version,title:title.max(120),kind:z.enum(["group","individual","recovery","sport","family","psychiatry"]),starts_at:instant,ends_at:instant,modality:z.enum(["in_person","remote"]),location:z.string().trim().max(160),weeks:z.coerce.number().int().min(1).max(12),patients:z.array(id).min(1).max(100),reason}).refine(p=>Date.parse(p.ends_at)>Date.parse(p.starts_at)&&Date.parse(p.ends_at)-Date.parse(p.starts_at)<=86400000,{message:"La actividad debe durar entre un minuto y 24 horas.",path:["ends_at"]}),
  event_close:z.object({id,version,status:z.enum(["completed","cancelled"]),reason}),
  attendance:z.object({id,patient_id:id,version,attendance:z.enum(["pending","present","absent","justified"]),punctuality:z.enum(["","on_time","late"]),participation:z.string().trim().max(150),reason}),
  plan:z.object({id,version,title,planned_for:instant,status:z.enum(["planned","cancelled"]),reason}),
  plan_complete:z.object({id,version}),
  commitment:z.object({id,version,patient_id:id,title,due_at:instant,visibility:z.enum(["coordination","patient"]),status:z.enum(["pending","cancelled"]),source_event_id:optionalId,responsible_id:optionalId,confirm_publish:z.boolean(),reason}),
  commitment_complete:z.object({id,version,result:z.string().trim().min(3).max(300),reason}),
  commitment_verify:z.object({id,version,result:z.string().trim().min(3).max(300),reason}),
  goals:z.object({patient_id:id,version,objectives:z.string().trim().max(600)}),
};
export const commitmentStatus=(c:{status:string;due_at:string|null;confirmation:string|null},cut=new Date())=>c.status==="completed"?(c.confirmation==="professional"?"Realizado y verificado":"Realizado según paciente"):c.status==="cancelled"?"Cancelado":c.due_at&&new Date(c.due_at)<cut?"Vencido · pendiente":"Pendiente";
