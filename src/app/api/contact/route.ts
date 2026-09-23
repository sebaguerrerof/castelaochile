import { NextResponse } from "next/server";

import { createContactSubmissionService, getContactFormMode } from "@/lib/server/contact-runtime";

export const runtime = "nodejs";

const MAX_PAYLOAD_BYTES = 12_000;

type BodyReadResult =
  | { kind: "ok"; body: unknown }
  | { kind: "invalid" }
  | { kind: "too-large" };

async function readLimitedBody(request: Request): Promise<BodyReadResult> {
  const reader = request.body?.getReader();
  if (!reader) return { kind: "invalid" };

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  let bytes = 0;

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_PAYLOAD_BYTES) {
        await reader.cancel();
        return { kind: "too-large" };
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return { kind: "ok", body: JSON.parse(text) as unknown };
  } catch {
    return { kind: "invalid" };
  } finally {
    reader.releaseLock();
  }
}

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function requestClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Solicitud no autorizada." }, { status: 403 });
  }

  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return NextResponse.json({ ok: false, message: "La solicitud no es válida." }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ ok: false, message: "La solicitud supera el tamaño permitido." }, { status: 413 });
  }

  const payload = await readLimitedBody(request);
  if (payload.kind === "too-large") {
    return NextResponse.json({ ok: false, message: "La solicitud supera el tamaño permitido." }, { status: 413 });
  }
  if (payload.kind === "invalid") {
    return NextResponse.json({ ok: false, message: "La solicitud no es válida." }, { status: 400 });
  }

  const mode = getContactFormMode();
  if (mode === "unavailable") {
    return NextResponse.json(
      { ok: false, message: "El formulario aún no está disponible públicamente." },
      { status: 503 },
    );
  }

  const outcome = await createContactSubmissionService(mode).submit(payload.body, requestClientKey(request));
  if (outcome.status === "invalid") {
    return NextResponse.json({ ok: false, errors: outcome.errors }, { status: 422 });
  }
  if (outcome.status === "blocked") return new NextResponse(null, { status: 204 });
  if (outcome.status === "rate-limited") {
    return NextResponse.json(
      { ok: false, message: "Espera unos minutos antes de intentar nuevamente." },
      { status: 429, headers: { "Retry-After": String(outcome.retryAfterSeconds) } },
    );
  }
  if (outcome.status === "delivery-failed") {
    return NextResponse.json(
      { ok: false, message: "No pudimos procesar el mensaje. Intenta nuevamente más tarde." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    mode === "preview"
      ? {
          ok: true,
          mode: "preview",
          message: "La prueba se validó localmente; no se envió ni se guardó ningún mensaje.",
        }
      : { ok: true, mode: "active", message: "Tu mensaje fue recibido correctamente." },
    { status: mode === "preview" ? 202 : 200 },
  );
}
