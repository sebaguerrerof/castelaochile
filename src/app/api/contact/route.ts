import { NextResponse } from "next/server";
import { z } from "zod";

import { parseContactSubmission } from "@/lib/contact-form-schema";
import { isContactIntakeEnabled, runtimeConfig } from "@/lib/runtime-config";
import { persistContactSubmission } from "@/lib/server/contact-submission-repository";
import { UpstashRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const maxPayloadBytes = 12_000;
const idempotencyKeySchema = z.uuid();
const sourcePathSchema = z.string().regex(/^\/[A-Za-z0-9/_-]*$/).max(180);

type BodyResult = { body: unknown; tooLarge: false } | { body: null; tooLarge: true };

function hasSameOrigin(request: Request) {
  try {
    const origin = request.headers.get("origin");
    return Boolean(origin && new URL(origin).origin === new URL(request.url).origin);
  } catch {
    return false;
  }
}

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

/** Enforces the wire-size limit even when the client sends a chunked body. */
async function readLimitedJson(request: Request): Promise<BodyResult> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > maxPayloadBytes) return { body: null, tooLarge: true };

  const reader = request.body?.getReader();
  if (!reader) return { body: null, tooLarge: false };

  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxPayloadBytes) {
        await reader.cancel();
        return { body: null, tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    return { body: JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))), tooLarge: false };
  } catch {
    return { body: null, tooLarge: false };
  }
}

export async function POST(request: Request) {
  if (!isContactIntakeEnabled()) {
    return NextResponse.json(
      { ok: false, message: "El formulario aún no está disponible públicamente." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!hasSameOrigin(request)) return NextResponse.json({ ok: false, message: "Solicitud no autorizada." }, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return NextResponse.json({ ok: false, message: "La solicitud no es válida." }, { status: 415 });
  }

  const input = await readLimitedJson(request);
  if (input.tooLarge) return NextResponse.json({ ok: false, message: "La solicitud supera el tamaño permitido." }, { status: 413 });
  if (!input.body) return NextResponse.json({ ok: false, message: "La solicitud no es válida." }, { status: 400 });

  const parsed = parseContactSubmission(input.body);
  if (!parsed.success) return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 422 });
  if (parsed.data.website) return new NextResponse(null, { status: 204 });

  const sourcePath = sourcePathSchema.safeParse(
    typeof input.body === "object" && input.body ? (input.body as Record<string, unknown>).sourcePath : null,
  );
  const idempotencyKey = idempotencyKeySchema.safeParse(request.headers.get("x-idempotency-key"));
  if (!sourcePath.success || !idempotencyKey.success) {
    return NextResponse.json({ ok: false, message: "La solicitud no es válida." }, { status: 400 });
  }

  const limiter = new UpstashRateLimiter(runtimeConfig.upstashUrl!, runtimeConfig.upstashToken!, {
    maxRequests: 3,
    windowSeconds: 600,
  });
  const decision = await limiter.check(`contact:${clientKey(request)}`);
  if (!decision.allowed) {
    return NextResponse.json(
      { ok: false, message: "Espera unos minutos antes de intentar nuevamente." },
      { status: 429, headers: { "Retry-After": String(decision.retryAfterSeconds) } },
    );
  }

  try {
    await persistContactSubmission(parsed.data, sourcePath.data, idempotencyKey.data);
  } catch {
    return NextResponse.json(
      { ok: false, message: "No pudimos procesar el mensaje. Intenta nuevamente más tarde." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, message: "Tu consulta fue recibida correctamente." },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
