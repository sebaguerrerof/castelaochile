import { NextResponse } from "next/server";
import { z } from "zod";

import { isAnalyticsEnabled, runtimeConfig } from "@/lib/runtime-config";
import { UpstashRateLimiter } from "@/lib/server/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const maxPayloadBytes = 512;
const eventSchema = z.object({
  event: z.literal("page_view"),
  path: z.string().regex(/^\/(?!admin(?:\/|$)|api(?:\/|$))[A-Za-z0-9/_-]*$/).max(180),
}).strict();
const botPattern = /bot|crawler|spider|preview|facebookexternalhit|slurp/i;

function hasSameOrigin(request: Request) {
  try {
    const origin = request.headers.get("origin");
    return Boolean(origin && new URL(origin).origin === new URL(request.url).origin);
  } catch {
    return false;
  }
}

function visitorKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

async function readLimitedJson(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > maxPayloadBytes) return { tooLarge: true as const, body: null };

  const reader = request.body?.getReader();
  if (!reader) return { tooLarge: false as const, body: null };
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxPayloadBytes) {
        await reader.cancel();
        return { tooLarge: true as const, body: null };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return { tooLarge: false as const, body: JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) as unknown };
  } catch {
    return { tooLarge: false as const, body: null };
  }
}

export async function POST(request: Request) {
  if (!isAnalyticsEnabled()) {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!hasSameOrigin(request) || botPattern.test(request.headers.get("user-agent") ?? "")) {
    return new NextResponse(null, { status: 204 });
  }

  const input = await readLimitedJson(request);
  if (input.tooLarge) return NextResponse.json({ ok: false }, { status: 413 });
  const parsed = eventSchema.safeParse(input.body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 422 });

  const limiter = new UpstashRateLimiter(runtimeConfig.upstashUrl!, runtimeConfig.upstashToken!, {
    maxRequests: 120,
    windowSeconds: 60,
  });
  const allowed = await limiter.check(`analytics:${visitorKey(request)}`);
  if (!allowed.allowed) return new NextResponse(null, { status: 204 });

  const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const { error } = await createAdminSupabaseClient().rpc("record_page_view", {
    p_path: parsed.data.path,
    p_event_date: date,
  });
  if (error) return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
