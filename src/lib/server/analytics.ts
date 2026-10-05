import { createHash } from "node:crypto";
import { analyticsEventSchema, excludesAnalytics, readAnalyticsConsent, visitorIdSchema } from "../analytics-policy.ts";

export type AnalyticsWrite = { p_event_id: string; p_path: string; p_visitor_hash: string };
export type AnalyticsDependencies = {
  isStaff: () => Promise<boolean>;
  allow: (key: string) => Promise<boolean>;
  persist: (event: AnalyticsWrite) => Promise<boolean>;
};

/** Cookie consent and a valid random identifier are mandatory; IP/UA are never persisted. */
export async function captureAnalytics(request: Request, visitorId: string | undefined, dependencies: AnalyticsDependencies): Promise<number> {
  if (readAnalyticsConsent(request.headers.get("cookie") ?? "") !== "accepted"
    || !visitorIdSchema.safeParse(visitorId).success || excludesAnalytics(request.headers)) return 204;
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
  if (!parsed.success) return 422;
  try {
    if (await dependencies.isStaff()) return 204;
    const visitorHash = createHash("sha256").update(`castelao-analytics:${visitorId}`).digest("hex");
    if (!await dependencies.allow(visitorHash)) return 429;
    return await dependencies.persist({ p_event_id: parsed.data.eventId, p_path: parsed.data.path, p_visitor_hash: visitorHash }) ? 204 : 503;
  } catch { return 503; }
}
