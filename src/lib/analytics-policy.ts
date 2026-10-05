import { z } from "zod";

export const analyticsConsentCookie = "castelao_analytics_consent";
export const analyticsVisitorCookie = "castelao_analytics_visitor";
export const analyticsCookieLifetime = 180 * 24 * 60 * 60;
export const analyticsConsentEvent = "castelao:analytics-consent";
export const visitorIdSchema = z.uuid();
export const analyticsEventSchema = z.object({
  event: z.literal("page_view"),
  eventId: z.uuid(),
  path: z.string().regex(/^\/(?!admin(?:\/|$)|api(?:\/|$))[A-Za-z0-9/_-]*$/).max(180),
}).strict();

export function readAnalyticsConsent(cookieHeader: string): "accepted" | "rejected" | null {
  const value = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${analyticsConsentCookie}=`))?.slice(analyticsConsentCookie.length + 1);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function excludesAnalytics(headers: Headers) {
  return /bot|crawler|spider|preview|facebookexternalhit|slurp|headless|lighthouse|playwright/i.test(headers.get("user-agent") ?? "")
    || headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

export function hasAnalyticsOrigin(request: Request, siteUrl: string, deployment: string | undefined) {
  try {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    // The flag can be enabled locally for UI QA; collection is production-only.
    return deployment === "production" && url.protocol === "https:"
      && url.origin === new URL(siteUrl).origin && origin === url.origin;
  } catch { return false; }
}
