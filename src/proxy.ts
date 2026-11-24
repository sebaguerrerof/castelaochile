import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasSupabasePublicConfig, supabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";
import { isClinicalRole, roleCareCapabilities } from "@/lib/staff-roles";

const adminHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive" };
function adminDeniedResponse() { return new NextResponse("Acceso denegado.", { status: 403, headers: adminHeaders }); }

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const patientRoute=pathname.startsWith("/pacientes") || pathname.startsWith("/api/pacientes");
  let response = NextResponse.next({ request: { headers: request.headers } });
  if (!hasSupabasePublicConfig()) {
    if (pathname.startsWith("/admin") || patientRoute) Object.entries(adminHeaders).forEach(([name, value]) => response.headers.set(name, value));
    return response;
  }
  const supabase = createServerClient<Database>(supabasePublicConfig.url!, supabasePublicConfig.publishableKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if(patientRoute) {
    Object.entries(adminHeaders).forEach(([name,value])=>response.headers.set(name,value));
    response.headers.set("Referrer-Policy","no-referrer");
    const reportDetail=pathname.match(/^\/pacientes\/reportes\/([^/]+)$/);
    if(user&&reportDetail&&process.env.CARE_PORTAL_ENABLED==="true") {
      if(!/^[0-9a-f-]{36}$/i.test(reportDetail[1]))return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
      const {data:patient}=await supabase.from("patient_profiles").select("id").eq("auth_user_id",user.id).eq("is_active",true).maybeSingle();
      if(!patient)return adminDeniedResponse();
      const {data:obligation,error:obligationError}=await supabase.from("care_report_obligations").select("id").eq("id",reportDetail[1]).eq("patient_id",patient.id).maybeSingle();
      if(obligationError||!obligation)return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
    }
    // Layouts, actions, APIs and RLS repeat authorization; proxy only refreshes the session.
    return response;
  }
  if (pathname === "/admin/login" || pathname === "/admin/activar") {
    Object.entries(adminHeaders).forEach(([name, value]) => response.headers.set(name, value));
    return response;
  }
  if (!user) { const login = new URL("/admin/login", request.url); login.searchParams.set("next", pathname); return NextResponse.redirect(login); }
  const { data: staff, error } = await supabase.from("admin_users").select("role, is_active").eq("user_id", user.id).maybeSingle();
  if (error || !staff?.is_active) return adminDeniedResponse();
  if(isClinicalRole(staff.role)&&staff.role!=="superadmin"&&!/^\/admin(?:$|\/(seguimiento|perfil|biblioteca)(?:\/|$))/.test(pathname))return adminDeniedResponse();
  // Deny care routes before streaming so HTTP status cannot turn into a 200 UI fallback.
  // Server actions, domain queries and RLS still repeat the same current authorization.
  if (pathname.startsWith("/admin/seguimiento") && process.env.CARE_PORTAL_ENABLED === "true") {
    const {data:permission,error:permissionError}=await supabase.from("care_staff_capabilities").select("capabilities").eq("user_id",user.id).maybeSingle();
    if(permissionError)return adminDeniedResponse();
    const caps=isClinicalRole(staff.role)?roleCareCapabilities(staff.role):permission?.capabilities??[];
    const detail=pathname.match(/^\/admin\/seguimiento\/pacientes\/([^/]+)/);
    const careEventDetail=pathname.match(/^\/admin\/seguimiento\/agenda\/([^/]+)/);
    if(detail) {
      if(!caps.includes("care.patient.read"))return adminDeniedResponse();
      if(pathname.includes("/decisiones")&&(!caps.includes("care.decisions.manage")||!caps.includes("care.records.read")))return adminDeniedResponse();
      const delegated=pathname.match(/\/(decisiones|tareas)\/([^/]+)$/);
      if(delegated&&delegated[2]!=="nuevo"){
        if(!/^[0-9a-f-]{36}$/i.test(delegated[2]))return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
        const r=delegated[1]==="decisiones"?await supabase.rpc("care_decision_read",{did:delegated[2]}):await supabase.rpc("care_task_read",{tid:delegated[2]});
        const data=r.data as {decision?:{patient_id:string};task?:{patient_id:string}}|null;
        if(r.error||(data?.decision?.patient_id??data?.task?.patient_id)!==detail[1])return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
      }
      if(pathname.endsWith("/indicadores")&&(!caps.includes("care.directory.read")||!caps.includes("care.records.read")))return adminDeniedResponse();
      if((pathname.includes("/autonomia")||pathname.includes("/familia"))&&!caps.includes("care.records.read"))return adminDeniedResponse();
      if(pathname.includes("/familia")&&!caps.includes("care.family.read"))return adminDeniedResponse();
      const extraDetail=pathname.match(/\/(autonomia|familia)\/([^/]+)$/);
      if(extraDetail&&extraDetail[2]!=="nuevo"){
        if(!/^[0-9a-f-]{36}$/i.test(extraDetail[2]))return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
        const table=extraDetail[1]==="autonomia"?"care_autonomy_observations":"care_family_records";
        const r=await supabase.from(table).select("id").eq("id",extraDetail[2]).eq("patient_id",detail[1]).maybeSingle();
        if(r.error||!r.data)return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
      }
      if(pathname.endsWith("/seguimiento")&&!caps.includes("care.records.read"))return adminDeniedResponse();
      if(pathname.includes("/registros")&&!caps.includes("care.records.read")&&!caps.includes("care.records.create"))return adminDeniedResponse();
      if(pathname.endsWith("/reportes")&&!caps.includes("care.records.read")&&!caps.includes("care.assignments.manage"))return adminDeniedResponse();
      if(!/^[0-9a-f-]{36}$/i.test(detail[1]))return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
      const {data:identity,error:identityError}=await supabase.rpc("care_patient_identity",{pid:detail[1]});
      if(identityError||!identity)return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
      const recordDetail=pathname.match(/\/registros\/([^/]+)$/);
      if(recordDetail&&recordDetail[1]!=="nuevo") {
        if(!/^[0-9a-f-]{36}$/i.test(recordDetail[1]))return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
        const {data:record,error:recordError}=await supabase.from("care_session_records").select("id").eq("id",recordDetail[1]).eq("patient_id",detail[1]).maybeSingle();
        if(recordError||!record)return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
      }
    } else if(careEventDetail) {
      if(careEventDetail[1]==="nuevo") {
        if(!caps.includes("care.records.create")||!caps.includes("care.directory.read"))return adminDeniedResponse();
      } else {
        if(!caps.includes("care.patient.read"))return adminDeniedResponse();
        if(!/^[0-9a-f-]{36}$/i.test(careEventDetail[1]))return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
        const {data:event,error:eventError}=await supabase.from("care_events").select("id").eq("id",careEventDetail[1]).maybeSingle();
        if(eventError||!event)return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});
      }
    } else if(pathname.startsWith("/admin/seguimiento/programaciones")) {
      if(!["care.decisions.manage","care.directory.read","care.patient.read","care.records.read","care.reports.export"].every(c=>caps.some(cap=>cap===c)))return adminDeniedResponse();
    } else if(pathname.startsWith("/admin/seguimiento/informes")) {
      if(!["care.directory.read","care.patient.read","care.records.read","care.reports.export"].every(c=>caps.some(cap=>cap===c)))return adminDeniedResponse();
      const inform=pathname.match(/^\/admin\/seguimiento\/informes\/([^/]+)/);
      if(inform){if(!/^[0-9a-f-]{36}$/i.test(inform[1]))return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});const r=await supabase.rpc("care_inform_read",{rid:inform[1]});if(r.error||!r.data)return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});if(pathname.endsWith("/comparacion")){const revision=request.nextUrl.searchParams.get("revision");if(revision&&!/^[1-9]\d*$/.test(revision))return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});const c=await supabase.rpc("care_inform_compare",{rid:inform[1],...(revision?{rev:Number(revision)}:{})});if(c.error||!c.data)return new NextResponse("Recurso no disponible.",{status:404,headers:adminHeaders});}}
    } else if(pathname.startsWith("/admin/seguimiento/alertas")||pathname.startsWith("/admin/seguimiento/evidencia")||pathname.startsWith("/admin/seguimiento/indicadores")) {
      if(!caps.includes("care.directory.read")||!caps.includes("care.patient.read")||!caps.includes("care.records.read"))return adminDeniedResponse();
    } else if(pathname==="/admin/seguimiento/agenda"||pathname.startsWith("/admin/seguimiento/decisiones")||pathname.startsWith("/admin/seguimiento/supervision")) {
      if(!caps.includes("care.decisions.manage")||!caps.includes("care.patient.read")||!caps.includes("care.records.read"))return adminDeniedResponse();
    } else if(pathname.startsWith("/admin/seguimiento/mi-trabajo")) {
      if(!caps.includes("care.patient.read")||(!caps.includes("care.records.create")&&!caps.includes("care.records.read")))return adminDeniedResponse();
    } else if(pathname.startsWith("/admin/seguimiento/rubricas")) {
      if(!caps.includes("care.decisions.manage")||!caps.includes("care.records.read"))return adminDeniedResponse();
    } else if(pathname.startsWith("/admin/seguimiento/intervenciones")) {
      if(!caps.includes("care.decisions.manage")||!caps.includes("care.patient.read"))return adminDeniedResponse();
    } else if(pathname.startsWith("/admin/seguimiento/equipo")) {
      if(staff.role!=="superadmin"&&!caps.includes("care.assignments.manage"))return adminDeniedResponse();
    } else if(!caps.includes("care.directory.read")&&!caps.includes("care.assignments.manage")&&staff.role!=="superadmin")return adminDeniedResponse();
    response.headers.set("Referrer-Policy","no-referrer");
  }
  Object.entries(adminHeaders).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}

export const config = { matcher: ["/admin/:path*", "/pacientes/:path*", "/api/pacientes/:path*"] };
