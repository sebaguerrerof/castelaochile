"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkLibraryRate, checkMutationOrigin, getPatientContext, portalEnabled } from "@/lib/patient-library/server";
import { internalPatientDestination, uuid } from "@/lib/patient-library/policy";

export type PatientActionState={message:string;ok:boolean};
export async function patientLogin(_:PatientActionState,form:FormData):Promise<PatientActionState> {
  let target="/pacientes";
  try {
    if(!portalEnabled()) return {ok:false,message:"El acceso todavía no está habilitado."};
    await checkMutationOrigin();
    const email=z.email().max(254).parse(form.get("email")).trim().toLowerCase();
    const password=z.string().min(1).max(200).parse(form.get("password"));
    await checkLibraryRate(`login:${(await headers()).get("x-forwarded-for")?.split(",")[0] ?? "unknown"}:${email}`);
    const client=await createServerSupabaseClient();
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error) return {ok:false,message:"No fue posible acceder. Revisa tus datos o solicita ayuda al equipo."};
    try {await getPatientContext();} catch {await client.auth.signOut();return {ok:false,message:"El acceso no está disponible. Contacta al equipo del Instituto."};}
    target=internalPatientDestination(form.get("next"));
  } catch {return {ok:false,message:"No fue posible acceder. Espera unos minutos y vuelve a intentarlo."};}
  redirect(target);
}
export async function patientRecovery(_:PatientActionState,form:FormData):Promise<PatientActionState> {
  const neutral={ok:true,message:"Si tu cuenta puede recuperar acceso, recibirás las instrucciones. También puedes contactar al equipo."};
  try {
    if(!portalEnabled()) return neutral;
    await checkMutationOrigin();
    const email=z.email().max(254).parse(form.get("email")).trim().toLowerCase();
    await checkLibraryRate(`recovery:${email}`);
    if(process.env.PATIENT_AUTH_EMAILS_ENABLED!=="true") return {ok:false,message:"La recuperación por correo no está disponible. Contacta al equipo."};
    const client=await createServerSupabaseClient();
    const target=new URL("/pacientes/activar",process.env.NEXT_PUBLIC_SITE_URL);
    await client.auth.resetPasswordForEmail(email,{redirectTo:target.toString()});
  } catch { /* Uniform response prevents email enumeration. */ }
  return neutral;
}
export async function patientPassword(_:PatientActionState,form:FormData):Promise<PatientActionState> {
  try {
    await checkMutationOrigin();
    const {client,user}=await getPatientContext();
    await checkLibraryRate(`password:${user.id}`);
    const password=z.string().min(12).max(128).parse(form.get("password"));
    if(password!==form.get("confirmation")) return {ok:false,message:"Las contraseñas no coinciden."};
    const {error}=await client.auth.updateUser({password});
    if(error) return {ok:false,message:"No fue posible cambiar la contraseña. Solicita un nuevo enlace de recuperación."};
    return {ok:true,message:"Contraseña guardada. Ya puedes entrar a tu biblioteca."};
  } catch {return {ok:false,message:"Usa una contraseña de al menos doce caracteres o solicita un nuevo enlace."};}
}
export async function patientLogout() {
  await checkMutationOrigin();
  const client=await createServerSupabaseClient();await client.auth.signOut();
  redirect("/pacientes/login");
}
export async function patientFavorite(_:PatientActionState,form:FormData):Promise<PatientActionState> {
  try {
    await checkMutationOrigin();
    const {client}=await getPatientContext();
    const mid=uuid.parse(form.get("id"));
    const {error}=await client.rpc("library_state",{mid,fav:form.get("favorite")==="true"});
    if(error) throw error;
    revalidatePath("/pacientes","layout");
    return {ok:true,message:form.get("favorite")==="true" ? "Guardado en favoritos." : "Retirado de favoritos."};
  } catch {return {ok:false,message:"No fue posible guardar. El material puede haber dejado de estar disponible."};}
}
