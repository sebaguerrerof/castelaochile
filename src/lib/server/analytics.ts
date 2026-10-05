import { createHash } from "node:crypto";
import { analyticsEventSchema, excludesAnalytics, readAnalyticsConsent, visitorIdSchema } from "../analytics-policy.ts";

export type AnalyticsWrite = { p_event_id: string; p_path: string; p_visitor_hash: string };
export type AnalyticsOutcome = "consent-required" | "visitor-required" | "privacy-or-bot" | "invalid-event" | "rate-limited" | "recorded" | "provider-error";
export type AnalyticsDependencies = {
  allow: (key: string) => Promise<boolean>;
  persist: (event: AnalyticsWrite) => Promise<boolean>;
  observe?: (outcome: AnalyticsOutcome) => void;
};

/** Cookie consent and a valid random identifier are mandatory; IP/UA are never persisted. */
export async function captureAnalytics(request: Request, visitorId: string | undefined, dependencies: AnalyticsDependencies): Promise<number> {
  const finish = (status: number, outcome: AnalyticsOutcome) => { dependencies.observe?.(outcome); return status; };
  if (readAnalyticsConsent(request.headers.get("cookie") ?? "") !== "accepted") return finish(204, "consent-required");
  if (!visitorIdSchema.safeParse(visitorId).success) return finish(204, "visitor-required");
  if (excludesAnalytics(request.headers)) return finish(204, "privacy-or-bot");
  if (Number(request.headers.get("content-length") ?? 0) > 512) return 413;
  const reader = request.body?.getReader();
  if (!reader) return 422;
  let body = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 512) { await reader.cancel(); return 413; }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally { reader.releaseLock(); }
  let input: unknown;
  try { input = JSON.parse(body); } catch { return 422; }
  const parsed = analyticsEventSchema.safeParse(input);
  if (!parsed.success) return finish(422, "invalid-event");
  try {
    // Scope is the public route, not the browser's unrelated CMS session.
    // The event schema excludes /admin and /api before any provider is called.
    const visitorHash = createHash("sha256").update(`castelao-analytics:${visitorId}`).digest("hex");
    if (!await dependencies.allow(visitorHash)) return finish(429, "rate-limited");
    return await dependencies.persist({ p_event_id: parsed.data.eventId, p_path: parsed.data.path, p_visitor_hash: visitorHash }) ? finish(204, "recorded") : finish(503, "provider-error");
  } catch { return finish(503, "provider-error"); }
}
