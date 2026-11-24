"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { checkMutationOrigin } from "@/lib/patient-library/server";
import { requireCare } from "@/lib/care/server";
import { careFieldErrors } from "@/lib/care/policy";
import type { CareFormState } from "@/components/care/care-form";
import { recoveryDimensionKeys,validateWeeklyPayload } from "@/lib/care/recovery-weekly";
import { careLocalToUtc } from "@/lib/care/time";
const reviewSchema=z.object({id:z.uuid(),version:z.coerce.number().int().min(1),outcome:z.enum(["pending","fulfilled","unfulfilled","unverifiable"]),result:z.string().trim().min(3).max(600),evidence:z.string().trim().min(3).max(600),support:z.string().trim().min(3).max(600),difficulties:z.string().trim().min(3).max(600),reason:z.string().trim().min(3).max(300)});
export async function recoveryCommitmentAction(_:CareFormState,form:FormData):Promise<CareFormState>{
  try {
    await checkMutationOrigin();const {client}=await requireCare("care.records.create");
    const p=reviewSchema.parse(Object.fromEntries(form.entries()));
    const result=await client.rpc("care_rc_commitment_review",{p});
    if(result.error)throw new Error((result.error.code==="40001"||result.error.code==="PT409")?"El compromiso cambió; conserva el texto y recarga antes de revisar.":"No se guardó la revisión. Comprueba alcance vigente, resultado y evidencia.");
    revalidatePath("/admin/seguimiento","layout");revalidatePath("/pacientes","layout");
    return {status:"success",message:"Revisión guardada con evidencia e historial.",savedAt:Date.now()};
  } catch(error){return error instanceof z.ZodError?{status:"error",message:"Revisa los campos señalados.",fieldErrors:careFieldErrors(error)}:{status:"error",message:error instanceof Error?error.message:"No fue posible guardar."};}
}
const fieldErrors=(error:z.ZodError)=>Object.fromEntries(error.issues.map(issue=>[issue.path.join("."),[issue.message]]));
const actionError=(error:unknown):CareFormState=>error instanceof z.ZodError?{status:"error",message:"Revisa los campos señalados.",fieldErrors:fieldErrors(error)}:{status:"error",message:error instanceof Error?error.message:"No fue posible confirmar el guardado."};
export async function recoveryGovernanceAction(_:CareFormState,form:FormData):Promise<CareFormState>{
  try{
    await checkMutationOrigin();const {client}=await requireCare("care.decisions.manage");
    const op=z.enum(["pilot","approve","criteria","retire","new_version"]).parse(form.get("op"));
    const p=z.object({id:z.uuid(),version:z.coerce.number().int().min(1),reference:z.string().trim().min(3).max(300),confirm:z.literal(true)}).parse({id:form.get("id"),version:form.get("version"),reference:form.get("reference"),confirm:form.get("confirm")==="on"});
    const extra:Record<string,string|boolean|string[]|unknown[]>={};
    if(op==="pilot"){extra.pilot_start=z.iso.date().parse(form.get("pilot_start"));extra.pilot_end=z.iso.date().parse(form.get("pilot_end"));extra.participants=z.array(z.uuid()).min(1).max(100).parse(form.getAll("participants"));}
    if(op==="approve"||op==="new_version")extra.effective_from=z.iso.date().parse(form.get("effective_from"));
    if(op==="criteria"){extra.enabled=form.get("enabled")==="on";extra.confirm_window=form.get("confirm_window")==="on";}
    if(op==="new_version"){
      extra.new_id=z.uuid().parse(form.get("new_id"));extra.document_version=z.string().regex(/^\d+\.\d+$/).parse(form.get("document_version"));
      const levels=["1","2","3","4","SE"].map(key=>({key,label:z.string().trim().min(3).max(100).parse(form.get(`level.${key}.label`)),description:z.string().trim().min(3).max(600).parse(form.get(`level.${key}.description`))}));
      extra.dimensions=recoveryDimensionKeys.map(key=>({key,label:z.string().trim().min(3).max(100).parse(form.get(`dimension.${key}.label`)),description:z.string().trim().min(3).max(600).parse(form.get(`dimension.${key}.description`)),levels}));
    }
    const result=await client.rpc("care_rc_govern",{op,p:{...p,...extra} as import("@/types/database").Json});
    if(result.error)throw new Error((result.error.code==="40001"||result.error.code==="PT409")?"La configuración cambió; recarga antes de registrar la decisión.":"No se registró la decisión. Comprueba referencia, fechas, participantes y permiso vigente.");
    revalidatePath("/admin/seguimiento","layout");return {status:"success",message:"Decisión guardada con autor, referencia e historial.",savedAt:Date.now()};
  }catch(error){return actionError(error);}
}
export async function recoveryWeekAction(_:CareFormState,form:FormData):Promise<CareFormState>{
  try{
    await checkMutationOrigin();const {client}=await requireCare("care.records.create");
    const op=z.enum(["draft","finalize","amend"]).parse(form.get("intent")??"draft");
    const identity=z.object({id:z.uuid(),patient_id:z.uuid(),rubric_id:z.uuid(),week_start:z.iso.date(),version:z.coerce.number().int().min(0),reason:z.string().trim().max(300)}).parse(Object.fromEntries(form.entries()));
    const payload=validateWeeklyPayload({dimensions:recoveryDimensionKeys.map((key,i)=>{const name=`dimensions.${i}.`;const value=(field:string)=>String(form.get(name+field)??"");return {key,status:value("status"),level:value("level")||null,evidence:value("evidence"),evidence_sufficient:form.get(name+"evidence_sufficient")==="on",support:value("support"),result:value("result"),difficulties:value("difficulties"),se_reason:value("se_reason"),record_ids:form.getAll(name+"record_ids").filter(Boolean),commitment_ids:form.getAll(name+"commitment_ids").filter(Boolean),next_commitment_id:value("next_commitment_id")||null};})},op!=="draft");
    const p={...identity,payload,evaluated_at:careLocalToUtc(form.get("evaluated_at")),occurred_at:careLocalToUtc(form.get("occurred_at")),confirm:form.get("confirm")==="on"};
    const result=await client.rpc("care_rc_week_write",{op,p});
    if(result.error)throw new Error((result.error.code==="40001"||result.error.code==="PT409")?"La semana ya tiene una revisión o cambió; conserva tu texto y recarga.":"No se guardó la revisión semanal. Comprueba fechas, autorización de niveles y fuentes vigentes del paciente.");
    revalidatePath("/admin/seguimiento","layout");return {status:"success",message:op==="draft"?"Borrador semanal privado guardado.":"Revisión semanal finalizada; original e historial conservados.",savedAt:Date.now(),nextPath:`/admin/seguimiento/pacientes/${identity.patient_id}/recovery/semanal?semana=${identity.week_start}&rubrica=${identity.rubric_id}`};
  }catch(error){return actionError(error);}
}
export async function recoveryValidationAction(_:CareFormState,form:FormData):Promise<CareFormState>{
  try{
    await checkMutationOrigin();const {client}=await requireCare("care.decisions.manage");
    const p=z.object({id:z.uuid(),patient_id:z.uuid(),rubric_id:z.uuid(),window_end:z.iso.date(),decision:z.enum(["validated","rejected","correction_requested"]),reason:z.string().trim().min(3).max(600),confirm:z.literal(true),weeks:z.array(z.object({id:z.uuid(),revision:z.number().int(),week_start:z.iso.date(),source_snapshots:z.array(z.record(z.string(),z.unknown()))})).length(4)}).parse({...Object.fromEntries(form.entries()),weeks:JSON.parse(String(form.get("weeks"))),confirm:form.get("confirm")==="on"});
    const result=await client.rpc("care_rc_validation_write",{p:p as import("@/types/database").Json});if(result.error)throw new Error("No se registró la decisión: revisa candidatura vigente, evidencia y autorización.");
    revalidatePath("/admin/seguimiento","layout");return {status:"success",message:"Decisión de Dirección guardada; conserva evidencia y autor.",savedAt:Date.now()};
  }catch(error){return actionError(error);}
}
