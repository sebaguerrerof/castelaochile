"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { requireCare,getCareCapabilities } from "@/lib/care/server";
import { careLocalToUtc } from "@/lib/care/time";
import { dimensionKeys,familyFields,familyPayload,observationPayload,writeIdentity } from "@/lib/care/recovery-family";
import { careFieldErrors } from "@/lib/care/policy";
import type { Json } from "@/types/database";
import type { CareFormState } from "@/components/care/care-form";
export async function recoveryFamilyAction(_:CareFormState,form:FormData):Promise<CareFormState>{
 try{
  await checkMutationOrigin();const op=z.enum(["rubric_save","rubric_approve","rubric_retire","autonomy_draft","autonomy_final","autonomy_amend","family_draft","family_final","family_amend","family_grant","family_revoke","agreement","agreement_complete","agreement_cancel","agreement_unshare"]).parse(form.get("intent")??form.get("op"));
  const {client}=await requireCare(op.startsWith("rubric_")?"care.decisions.manage":"care.records.create");const caps=await getCareCapabilities();if(!caps.includes("care.records.read")||!op.startsWith("rubric_")&&!op.startsWith("autonomy_")&&!caps.includes("care.family.read"))throw new Error("No tienes permiso para esta acción.");
  const p:Record<string,unknown>=writeIdentity.parse(Object.fromEntries(form.entries()));
  const text=(key:string,max=600)=>z.string().trim().max(max).parse(form.get(key)??"");
  const flag=(key:string)=>form.get(key)==="on";
  p.reason=text("reason",300);
  if(op==="rubric_save"){
   p.name=z.string().trim().min(3).max(100).parse(form.get("name"));p.family_id=form.get("family_id")?z.uuid().parse(form.get("family_id")):null;p.ordered=flag("ordered");
   const dimensions=dimensionKeys.filter(k=>flag(`dimension_${k}`)).map(key=>({key,levels:text(`levels_${key}`,600).split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map((label,i)=>({key:`level_${i+1}`,label}))}));
   p.dimensions=z.array(z.object({key:z.enum(dimensionKeys as [typeof dimensionKeys[number],...typeof dimensionKeys[number][]]),levels:z.array(z.object({key:z.string(),label:z.string().min(2).max(80)})).min(2).max(6)})).min(1).max(8).parse(dimensions);
  }else if(op==="rubric_approve"){p.approval_reference=text("approval_reference",300);p.confirm_approval=flag("confirm_approval");if(!p.confirm_approval||String(p.approval_reference).length<3)return {status:"error",message:"Registra la aprobación efectiva del equipo y su referencia."};}
  else if(op.startsWith("autonomy_")){
   p.record_id=z.uuid().parse(form.get("record_id"));p.dimension=z.enum(dimensionKeys as [typeof dimensionKeys[number],...typeof dimensionKeys[number][]]).parse(form.get("dimension"));p.rubric_id=form.get("rubric_id")?z.uuid().parse(form.get("rubric_id")):null;p.occurred_at=careLocalToUtc(form.get("occurred_at"));
   const payload=observationPayload.parse({status:form.get("status")??"",level:form.get("level")??"",evidence:form.get("evidence")??""});p.payload=payload;p.confirm_final=flag("confirm_final");
   if(op!=="autonomy_draft"&&(!p.confirm_final||!payload.status||payload.evidence.length<3))return {status:"error",message:"Indica evaluación o no evaluable, evidencia y confirma finalizar.",fieldErrors:{...(!payload.status?{status:["Selecciona el estado."]}:{}),...(payload.evidence.length<3?{evidence:["Describe evidencia o motivo de no evaluable."]}:{}),...(!p.confirm_final?{confirm_final:["Confirmación requerida."]}:{})}};
  }else if(["family_draft","family_final","family_amend"].includes(op)){
   p.event_id=z.uuid().parse(form.get("event_id"));p.occurred_at=careLocalToUtc(form.get("occurred_at"));p.reserved_note=text("reserved_note",2000);p.confirm_final=flag("confirm_final");
   const participantRows=Array.from({length:6},(_,i)=>({label:text(`participant_${i}`,60),relationship:text(`relationship_${i}`,50),i})).filter(p=>p.label||p.relationship);
   for(const row of participantRows)if(row.label.length<2||row.relationship.length<2)return {status:"error",message:"Revisa identificación mínima y vínculo del participante.",fieldErrors:{...(row.label.length<2?{[`participant_${row.i}`]:["Usa al menos dos caracteres."]}:{}),...(row.relationship.length<2?{[`relationship_${row.i}`]:["Vínculo requerido, al menos dos caracteres."]}:{})}};
   const participants=participantRows.map(({label,relationship})=>({label,relationship}));
   const payload=familyPayload.parse({objective:text("objective"),source:form.get("source")??"",participants,...Object.fromEntries(Object.keys(familyFields).map(k=>[k,text(k)]))});p.payload=payload;
   if(op!=="family_draft"&&(!p.confirm_final||payload.objective.length<3||!payload.source||!participants.length))return {status:"error",message:"Completa objetivo, fuente, al menos un participante y confirma finalizar.",fieldErrors:{...(payload.objective.length<3?{objective:["Objetivo requerido."]}:{}),...(!payload.source?{source:["Selecciona la fuente."]}:{}),...(!participants.length?{participant_0:["Identificación mínima requerida."]}:{}),...(!p.confirm_final?{confirm_final:["Confirmación requerida."]}:{})}};
  }else if(op==="family_grant"||op==="family_revoke"){p.reader=z.uuid().parse(form.get("reader"));p.note_id=form.get("note_id")?z.uuid().parse(form.get("note_id")):null;}
  else if(op.startsWith("agreement")){
   p.record_id=z.uuid().parse(form.get("record_id"));p.result=text("result",300);
   if(op==="agreement"){p.title=z.string().trim().min(3).max(160).parse(form.get("title"));p.responsible=z.string().trim().min(2).max(80).parse(form.get("responsible"));p.due_at=careLocalToUtc(form.get("due_at"));p.share_patient=flag("share_patient");p.patient_body=text("patient_body",300);p.confirm_publish=flag("confirm_publish");if(p.share_patient&&(!p.confirm_publish||String(p.patient_body).length<3))return {status:"error",message:"Confirma compartir y redacta un texto exclusivo para el paciente.",fieldErrors:{confirm_publish:["Confirma la publicación del texto."],patient_body:["Texto compartido requerido."]}};}
  }
  if((op.endsWith("amend")||op.startsWith("agreement")||op==="rubric_retire")&&String(p.reason).length<3)return {status:"error",message:"Explica el motivo del cambio.",fieldErrors:{reason:["Motivo requerido."]}};
  const result=await client.rpc("care_recovery_write",{op,p:p as Json});if(result.error)throw new Error(result.error.code==="40001"?"El registro cambió. Conserva el texto y recarga antes de guardar.":result.error.code==="23505"?"Ya existe un registro para esta sesión y dimensión. Ábrelo desde la ficha.":"No fue posible guardar. Revisa fecha, sesión realizada, permisos y campos requeridos.");
  const section=op.startsWith("autonomy_")?"autonomia":"familia";const nextPath=p.version===0&&(op.startsWith("autonomy_")||op.startsWith("family_"))?`/admin/seguimiento/pacientes/${p.patient_id}/${section}/${p.id}`:undefined;
  if(!nextPath)revalidatePath("/admin/seguimiento","layout");revalidatePath("/pacientes","layout");return {status:"success",message:op.endsWith("draft")?"Borrador privado guardado.":op==="rubric_approve"?"Aprobación registrada con referencia y versión.":"Cambios guardados; historial conservado.",savedAt:Date.now(),...(nextPath?{nextPath}:{})};
 }catch(error){if(error instanceof z.ZodError)return {status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(error)};return {status:"error",message:error instanceof Error?error.message:"No fue posible guardar."};}
}
