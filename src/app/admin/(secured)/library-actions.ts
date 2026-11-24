"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkLibraryRate, checkMutationOrigin, portalEnabled, requireLibraryStaff } from "@/lib/patient-library/server";
import { materialSchema, uuid } from "@/lib/patient-library/policy";
import { sanitizeTherapeuticHtml } from "@/lib/patient-library/html";
import { sendPatientAccessEmail } from "@/lib/patient-library/invitations";
import type { AdminActionState } from "@/lib/admin-action-state";
import type { Json } from "@/types/database";

const text=(form:FormData,key:string)=>String(form.get(key) ?? "");
const optionalId=z.union([uuid,z.literal("")]);
const schemas={
  patient:z.object({email:z.email().max(254).transform(v=>v.trim().toLowerCase()),display_name:z.string().trim().min(2).max(100)}),
  patient_status:z.object({id:uuid,is_active:z.boolean()}),
  group:z.object({id:optionalId,name:z.string().trim().min(2).max(100),description:z.string().trim().max(300),is_active:z.boolean()}),
  membership:z.object({group_id:uuid,patient_id:uuid,is_active:z.boolean()}),
  area:z.object({id:optionalId,name:z.string().trim().min(2).max(100),is_active:z.boolean()}),
  folder:z.object({id:optionalId,area_id:uuid,parent_id:optionalId,name:z.string().trim().min(1).max(120),is_active:z.boolean()}),
  attachment_retire:z.object({id:uuid,version:z.coerce.number().int().positive()}),
};
function failure(error:unknown):AdminActionState {
  if(error instanceof z.ZodError) return {status:"error",message:"Revisa los campos obligatorios y sus límites.",fieldErrors:z.flattenError(error).fieldErrors as Record<string,string[]>};
  return {status:"error",message:error instanceof Error ? error.message : "No fue posible completar la operación."};
}
function databaseFailure(message:string) {
  // Never expose DB detail/hint/row values or credentials in forms.
  const safe=/^(El material cambió\.|Confirma explícitamente|Revisa y confirma|Un informe requiere|Selecciona destinatarios|Archiva o|Traslada primero|Traslada o|Carpeta circular|Carpeta padre no válida|Carpeta no válida para el área|Área no disponible|Resuelve o retira|Agrega texto o|Audiencia incompatible|Grupos no válidos|Pacientes no válidos|Máximo cinco|Selecciona staff activo)/;
  return new Error(safe.test(message) ? message : "No fue posible guardar. Comprueba los datos y vínculos únicos.");
}
export async function manageLibraryAction(_:AdminActionState,form:FormData):Promise<AdminActionState> {
  let destination="/admin/biblioteca";
  try {
    await checkMutationOrigin();
    const op=z.enum(["patient","patient_status","group","membership","area","folder","attachment_retire"]).parse(form.get("op"));
    if(!portalEnabled()) throw new Error("El portal todavía no está habilitado en este entorno.");
    await requireLibraryStaff(["patient","patient_status","group","membership"].includes(op) ? "access" : "content");
    const input:Record<string,unknown>=Object.fromEntries(form.entries());
    for(const key of ["is_active","manage_access","manage_content","read_content"]) input[key]=form.get(key)==="on";
    const p=schemas[op].parse(input) as Json;
    const client=await createServerSupabaseClient();
    const {error}=await client.rpc("library_manage",{op,p});if(error) throw databaseFailure(error.message);
    destination=op==="patient" || op==="patient_status" ? "/admin/pacientes" : op==="group" || op==="membership" ? "/admin/grupos-terapeuticos" : "/admin/biblioteca";
    if(op==="patient_status") destination+=`?resultado=${input.is_active ? "acceso-habilitado" : "acceso-suspendido"}`;
    if(op==="attachment_retire") {const mid=uuid.parse(form.get("material_id"));destination=`/admin/biblioteca/${mid}/editar`;}
    revalidatePath("/admin","layout");revalidatePath("/pacientes","layout");
  } catch(error) {return failure(error);}
  redirect(destination+(destination.includes("?") ? "&" : "?")+"guardado=1");
}
async function persistLibraryMaterial(form:FormData) {
    await checkMutationOrigin();
    const {client}=await requireLibraryStaff("content");
    const p=materialSchema.parse({id:text(form,"id"),version:text(form,"version"),title:text(form,"title"),description:text(form,"description"),area_id:text(form,"area_id"),folder_id:text(form,"folder_id"),kind:text(form,"kind"),body:sanitizeTherapeuticHtml(text(form,"body")),tags:text(form,"tags").split(",").map(v=>v.trim()).filter(Boolean),session_date:text(form,"session_date"),audience:text(form,"audience"),patients:form.getAll("patients"),groups:form.getAll("groups"),status:text(form,"status"),confirm_audience:form.get("confirm_audience")==="on",confirm_publish:form.get("confirm_publish")==="on"});
    const {data,error}=await client.rpc("library_manage",{op:"material",p});if(error) throw databaseFailure(error.message);
    const id=uuid.parse((data as {id:string}).id);
    const {data:current,error:readError}=await client.from("patient_library_materials").select("version").eq("id",id).single();
    if(readError || !current) throw new Error("No pudimos confirmar el guardado. Recarga la biblioteca antes de reintentar.");
    revalidatePath("/admin/biblioteca");revalidatePath("/pacientes","layout");
    return {id,version:current.version};
}
export async function saveLibraryMaterialInPlace(form:FormData) {
  try { return {ok:true as const,...await persistLibraryMaterial(form)}; }
  catch(error) { return {ok:false as const,state:failure(error)}; }
}
export async function saveLibraryMaterial(_:AdminActionState,form:FormData):Promise<AdminActionState> {
  let id="";
  try { id=(await persistLibraryMaterial(form)).id;
  } catch(error) {return failure(error);}
  redirect(`/admin/biblioteca/${id}/editar?guardado=1`);
}
async function sendPatientInvitation(id:string,client:Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const profile=await client.from("patient_profiles").select("email").eq("id",id).maybeSingle();
  if(profile.error)throw new Error("No fue posible comprobar el destinatario.");
  if(profile.data?.email.toLowerCase().endsWith("@example.invalid"))throw new Error("Las cuentas DEMO no reciben invitaciones ni correos.");
  const target=new URL("/pacientes/activar",process.env.NEXT_PUBLIC_SITE_URL).toString();
  return sendPatientAccessEmail({
    enabled:process.env.PATIENT_AUTH_EMAILS_ENABLED==="true",
    claim:async()=>{
      const {data,error}=await client.rpc("library_manage",{op:"invitation_claim",p:{id}});
      if(error || !data) throw new Error("No fue posible preparar la invitación. Comprueba que el paciente esté activo y espera cinco minutos antes de reintentar.");
      return data;
    },
    invite:email=>createAdminSupabaseClient().auth.admin.inviteUserByEmail(email,{redirectTo:target}),
    recover:email=>client.auth.resetPasswordForEmail(email,{redirectTo:target}),
    complete:async success=>{
      const {error}=await client.rpc("library_manage",{op:"invitation_result",p:{id,success}});
      if(error) throw new Error("No fue posible registrar el resultado.");
    },
  });
}

export async function createLibraryPatient(_:AdminActionState,form:FormData):Promise<AdminActionState> {
  let saved=false;
  const send=form.get("send_invitation")==="on";
  try {
    await checkMutationOrigin();
    const {client,admin}=await requireLibraryStaff("access");
    const p=schemas.patient.parse(Object.fromEntries(form.entries()));
    if(send && process.env.PATIENT_AUTH_EMAILS_ENABLED!=="true") throw new Error("Envío de correos desactivado. Desmarca el envío para guardar únicamente el perfil.");
    await checkLibraryRate(`patient-create:${admin.user.id}`);
    if(send) await checkLibraryRate(`invite:${admin.user.id}`);
    const {data,error}=await client.rpc("library_manage",{op:"patient",p});
    if(error) throw databaseFailure(error.message);
    const id=uuid.parse((data as {id:string}).id);
    saved=true;
    if(send) await sendPatientInvitation(id,client);
    revalidatePath("/admin/pacientes");
  } catch(error) {
    if(saved) {
      revalidatePath("/admin/pacientes");
      return {status:"error",message:`El paciente quedó guardado. ${failure(error).message}`};
    }
    return failure(error);
  }
  redirect(`/admin/pacientes?resultado=${send ? "acceso-enviado" : "paciente-guardado"}`);
}

export async function inviteLibraryPatient(_:AdminActionState,form:FormData):Promise<AdminActionState> {
  try {
    await checkMutationOrigin();
    const {client,admin}=await requireLibraryStaff("access");
    await checkLibraryRate(`invite:${admin.user.id}`);
    await sendPatientInvitation(uuid.parse(form.get("id")),client);
    revalidatePath("/admin/pacientes");
  } catch(error) {revalidatePath("/admin/pacientes");return failure(error);}
  redirect("/admin/pacientes?resultado=acceso-enviado");
}
