import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CareCapability } from "@/types/care";
import { isClinicalRole, roleCareCapabilities } from "@/lib/staff-roles";
export const careEnabled=()=>process.env.CARE_PORTAL_ENABLED==="true";
export async function getCareCapabilities():Promise<CareCapability[]> {
  if(!careEnabled()) return [];
  const client=await createServerSupabaseClient();
  const {data:{user}}=await client.auth.getUser();if(!user)return [];
  const {data:staff,error:staffError}=await client.from("admin_users").select("role,is_active").eq("user_id",user.id).maybeSingle();
  if(staffError) throw new Error("No fue posible verificar el perfil del equipo.");
  if(!staff?.is_active)return [];
  if(isClinicalRole(staff.role))return roleCareCapabilities(staff.role);
  const {data,error}=await client.from("care_staff_capabilities").select("capabilities").eq("user_id",user.id).maybeSingle();
  if(error) throw new Error("No fue posible verificar permisos de seguimiento.");
  return data?.capabilities??[];
}
export async function requireCare(cap:CareCapability) {
  const admin=await requireAdmin();
  if(!careEnabled()||!(await getCareCapabilities()).includes(cap)) forbidden();
  return {admin,client:await createServerSupabaseClient()};
}
const identity=z.object({id:z.uuid(),display_name:z.string(),is_active:z.boolean()});
export async function careDirectory(q="",page=1,management=false) {
  const {client}=await requireCare(management?"care.assignments.manage":"care.directory.read");
  const {data,error}=await client.rpc("care_directory",{q,page,management});
  if(error) throw new Error("No fue posible cargar los pacientes autorizados.");
  return z.object({total:z.number().int(),patients:z.array(identity)}).parse(data);
}
export async function carePatient(pid:string) {
  if(!z.uuid().safeParse(pid).success)notFound();
  const {client}=await requireCare("care.patient.read");
  const {data,error}=await client.rpc("care_patient_identity",{pid});
  if(error||!data)notFound();
  return {client,patient:identity.parse(data)};
}
export async function careTeam() {
  const {client}=await requireCare("care.assignments.manage");
  const {data,error}=await client.rpc("care_team");if(error)throw new Error("No fue posible cargar el equipo habilitado.");
  return z.array(z.object({user_id:z.uuid(),label:z.string()})).parse(data);
}
export async function careResponsibles(pid:string) {
  const {client}=await requireCare("care.patient.read");
  const {data,error}=await client.rpc("care_responsibles",{pid});if(error)throw new Error("No fue posible cargar responsables.");
  return z.array(z.object({id:z.uuid(),user_id:z.uuid(),label:z.string(),specialty:z.enum(["direction","psychology","recovery","psychiatry"])})).parse(data);
}
