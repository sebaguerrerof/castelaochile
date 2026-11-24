import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DevelopmentRateLimiter, UpstashRateLimiter } from "@/lib/server/rate-limit";
import { hasSharedRateLimitConfig, runtimeConfig } from "@/lib/runtime-config";
import { hasLibraryCapability, sameOrigin } from "./policy";
import type { LibraryCapability, LibraryPermissions } from "@/types/patient-library";
import { isCareLocalQa } from "@/lib/care/local-qa";

export const portalEnabled = () => process.env.PATIENT_PORTAL_ENABLED === "true";
export class LibraryAccessError extends Error { constructor() { super("Recurso no disponible."); } }
export async function getLibraryPermissions(): Promise<LibraryPermissions | null> {
  if (!portalEnabled()) return null;
  const client=await createServerSupabaseClient();
  const {data:{user}}=await client.auth.getUser();
  if (!user) return null;
  const [{data:admin},{data:permissions}]=await Promise.all([
    client.from("admin_users").select("role,is_active").eq("user_id",user.id).maybeSingle(),
    client.from("therapeutic_staff_permissions").select("manage_access,manage_content,read_content").eq("user_id",user.id).maybeSingle(),
  ]);
  if(admin?.is_active && admin.role==="superadmin")return {manage_access:true,manage_content:true,read_content:true};
  return admin?.is_active ? permissions : null;
}
export async function requireLibraryStaff(cap: LibraryCapability) {
  if (!portalEnabled()) throw new LibraryAccessError();
  const admin=await requireAdmin();
  if (!hasLibraryCapability(await getLibraryPermissions(),cap)) throw new LibraryAccessError();
  return {admin,client:await createServerSupabaseClient()};
}
export async function getPatientContext() {
  if (!portalEnabled()) throw new LibraryAccessError();
  const client=await createServerSupabaseClient();
  const {data:{user},error}=await client.auth.getUser();
  if (error || !user) throw new LibraryAccessError();
  const {data:patient,error:profileError}=await client.from("patient_profiles").select("id,display_name,is_active").eq("auth_user_id",user.id).eq("is_active",true).maybeSingle();
  if (profileError || !patient) throw new LibraryAccessError();
  return {client,patient,user};
}
export async function requirePatientPage() {
  try { return await getPatientContext(); } catch { redirect("/pacientes/login?estado=acceso"); }
}
const localLimiter=new DevelopmentRateLimiter({maxRequests:15,windowSeconds:300});
export async function checkLibraryRate(key: string) {
  const limiter=hasSharedRateLimitConfig() ? new UpstashRateLimiter(runtimeConfig.upstashUrl!,runtimeConfig.upstashToken!,{maxRequests:15,windowSeconds:300}) : process.env.NODE_ENV!=="production" || isCareLocalQa() ? localLimiter : null;
  if (!limiter || !(await limiter.check(`patient-library:${key}`)).allowed) throw new Error("Espera unos minutos y vuelve a intentarlo.");
}
export async function checkMutationOrigin() {
  const h=await headers();
  const origin=h.get("origin");
  // Fixed canonical origin; localhost is allowed only outside production.
  const expected=process.env.NEXT_PUBLIC_SITE_URL;
  const local=process.env.NODE_ENV!=="production" && origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    && new URL(origin).host===h.get("host");
  if (!local && (!expected || !sameOrigin(origin,expected))) throw new LibraryAccessError();
}
