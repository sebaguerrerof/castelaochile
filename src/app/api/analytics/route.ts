import { NextRequest, NextResponse } from "next/server";
import { analyticsVisitorCookie, hasAnalyticsOrigin } from "@/lib/analytics-policy";
import { siteConfig } from "@/config/site";
import { isAnalyticsEnabled, runtimeConfig } from "@/lib/runtime-config";
import { captureAnalytics } from "@/lib/server/analytics";
import { UpstashRateLimiter } from "@/lib/server/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const report = (outcome: string) => console.info(JSON.stringify({ feature: "analytics", outcome }));
  const headers = { "Cache-Control": "no-store" };
  if (!isAnalyticsEnabled()) { report("disabled"); return NextResponse.json({ ok: false }, { status: 503, headers }); }
  if (!hasAnalyticsOrigin(request, siteConfig.url, process.env.VERCEL_ENV)) { report("origin-excluded"); return new NextResponse(null, { status: 204, headers }); }
  const limiter = new UpstashRateLimiter(runtimeConfig.upstashUrl!, runtimeConfig.upstashToken!, { maxRequests: 120, windowSeconds: 60 });
  const networkLimiter = new UpstashRateLimiter(runtimeConfig.upstashUrl!, runtimeConfig.upstashToken!, { maxRequests: 300, windowSeconds: 60 });
  const status = await captureAnalytics(request, request.cookies.get(analyticsVisitorCookie)?.value, {
    observe: report,
    allow: async (key) => {
      const network = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
      if (!(await networkLimiter.check(`analytics-network:${network}`)).allowed) return false;
      return (await limiter.check(`analytics:${key}`)).allowed;
    },
    persist: async (event) => {
      const { error } = await createAdminSupabaseClient().rpc("record_consented_page_view", event);
      if (error) console.error(JSON.stringify({ feature: "analytics", stage: "storage", code: error.code }));
      return !error;
    },
  });
  return new NextResponse(null, { status, headers });
}
