import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasSupabasePublicConfig, supabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

const adminHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive" };
function adminDeniedResponse() { return new NextResponse("Acceso denegado.", { status: 403, headers: adminHeaders }); }

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({ request: { headers: request.headers } });
  if (!hasSupabasePublicConfig()) {
    if (pathname.startsWith("/admin")) Object.entries(adminHeaders).forEach(([name, value]) => response.headers.set(name, value));
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
  if (pathname === "/admin/login" || pathname === "/admin/activar") {
    Object.entries(adminHeaders).forEach(([name, value]) => response.headers.set(name, value));
    return response;
  }
  if (!user) return NextResponse.redirect(new URL("/admin/login", request.url));
  const { data: staff, error } = await supabase.from("admin_users").select("role, is_active").eq("user_id", user.id).maybeSingle();
  if (error || !staff?.is_active) return adminDeniedResponse();
  Object.entries(adminHeaders).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
