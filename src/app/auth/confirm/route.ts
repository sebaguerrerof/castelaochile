import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasSupabasePublicConfig, supabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";
import { portalEnabled } from "@/lib/patient-library/server";

const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive" };

function redirectToLogin(request: NextRequest, patient=false) {
  const url = new URL(patient ? "/pacientes/login" : "/admin/login", request.url);
  url.searchParams.set("reason", "invite-invalid");
  return NextResponse.redirect(url, { headers });
}

export async function GET(request: NextRequest) {
  // The email template supplies RedirectTo as next. Only exact known paths affect routing.
  let patient=false;
  try { patient=new URL(request.nextUrl.searchParams.get("next") ?? "",request.url).pathname==="/pacientes/activar"; } catch { /* Default admin flow. */ }
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || (type !== "invite" && type !== "recovery") || !hasSupabasePublicConfig() || (patient && !portalEnabled())) return redirectToLogin(request,patient);

  const redirectUrl = new URL("/admin/activar", request.url);
  if(patient) redirectUrl.pathname="/pacientes/activar";
  const response = NextResponse.redirect(redirectUrl, { headers });
  const supabase = createServerClient<Database>(supabasePublicConfig.url!, supabasePublicConfig.publishableKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  return error ? redirectToLogin(request,patient) : response;
}
