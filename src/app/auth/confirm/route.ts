import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasSupabasePublicConfig, supabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive" };

function redirectToLogin(request: NextRequest) {
  const url = new URL("/admin/login", request.url);
  url.searchParams.set("reason", "invite-invalid");
  return NextResponse.redirect(url, { headers });
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || (type !== "invite" && type !== "recovery") || !hasSupabasePublicConfig()) return redirectToLogin(request);

  const redirectUrl = new URL("/admin/activar", request.url);
  const response = NextResponse.redirect(redirectUrl, { headers });
  const supabase = createServerClient<Database>(supabasePublicConfig.url!, supabasePublicConfig.publishableKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  return error ? redirectToLogin(request) : response;
}
