import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { analyticsConsentCookie, analyticsCookieLifetime, analyticsVisitorCookie, visitorIdSchema } from "@/lib/analytics-policy";
import { isAnalyticsEnabled } from "@/lib/runtime-config";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  // This body consists of one literal boolean; cap the stream before parsing it.
  const reader = request.body?.getReader();
  if (!reader) return new NextResponse(null, { status: 422 });
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 64) { await reader.cancel(); return new NextResponse(null, { status: 413 }); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let accepted: boolean;
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (typeof body.accepted !== "boolean" || Object.keys(body).length !== 1) throw new Error("Invalid consent");
    accepted = body.accepted;
  } catch { return new NextResponse(null, { status: 422 }); }
  if (accepted && !isAnalyticsEnabled()) return new NextResponse(null, { status: 503 });
  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const options = { path: "/", sameSite: "lax" as const, secure: new URL(request.url).protocol === "https:", maxAge: analyticsCookieLifetime };
  response.cookies.set(analyticsConsentCookie, accepted ? "accepted" : "rejected", options);
  const existing = request.cookies.get(analyticsVisitorCookie)?.value;
  response.cookies.set(analyticsVisitorCookie, accepted ? (visitorIdSchema.safeParse(existing).success ? existing! : randomUUID()) : "", { ...options, httpOnly: true, maxAge: accepted ? analyticsCookieLifetime : 0 });
  return response;
}
