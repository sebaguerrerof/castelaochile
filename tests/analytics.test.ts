import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { captureAnalytics, type AnalyticsWrite } from "../src/lib/server/analytics.ts";
import { analyticsConsentCookie, analyticsEventSchema, hasAnalyticsOrigin, readAnalyticsConsent } from "../src/lib/analytics-policy.ts";
import { analyticsVariation, type WebAnalytics } from "../src/lib/analytics-report.ts";

const visitor = randomUUID();
function request({ consent = "accepted", headers = {}, body = { event: "page_view", eventId: randomUUID(), path: "/blog" } }: { consent?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  return new Request("https://castelaochile.vercel.app/api/analytics", { method: "POST", headers: { origin: "https://castelaochile.vercel.app", cookie: `${analyticsConsentCookie}=${consent}`, ...headers }, body: JSON.stringify(body) });
}
function dependencies({ staff = false, allowed = true, throws = false } = {}) {
  const writes: AnalyticsWrite[] = [];
  return { writes, isStaff: async () => staff, allow: async () => allowed, persist: async (write: AnalyticsWrite) => { if (throws) throw new Error("offline"); writes.push(write); return true; } };
}

test("unknown, rejected or malformed consent cannot persist an event", async () => {
  for (const consent of ["", "rejected", "true", "accepted_extra"]) {
    const deps = dependencies();
    assert.equal(await captureAnalytics(request({ consent }), visitor, deps), 204);
    assert.equal(deps.writes.length, 0);
  }
  assert.equal(readAnalyticsConsent(`other=value; ${analyticsConsentCookie}=accepted`), "accepted");
  const deps = dependencies();
  assert.equal(await captureAnalytics(request(), "not-a-uuid", deps), 204);
  assert.equal(deps.writes.length, 0);
});

test("robots, DNT, GPC and signed-in staff are excluded", async () => {
  for (const headers of [{ "user-agent": "Googlebot" }, { "user-agent": "HeadlessChrome" }, { dnt: "1" }, { "sec-gpc": "1" }]) {
    const deps = dependencies();
    assert.equal(await captureAnalytics(request({ headers }), visitor, deps), 204);
    assert.equal(deps.writes.length, 0);
  }
  const deps = dependencies({ staff: true });
  assert.equal(await captureAnalytics(request(), visitor, deps), 204);
  assert.equal(deps.writes.length, 0);
});

test("a consented navigation persists only a stable hashed identity, path and event ID", async () => {
  const eventId = randomUUID();
  const deps = dependencies();
  assert.equal(await captureAnalytics(request({ body: { event: "page_view", eventId, path: "/blog" }, headers: { "x-forwarded-for": "192.0.2.1", "user-agent": "Browser" } }), visitor, deps), 204);
  assert.equal(await captureAnalytics(request({ body: { event: "page_view", eventId, path: "/blog" } }), visitor, deps), 204);
  assert.deepEqual(deps.writes[0], deps.writes[1]); // SQL deduplicates these identical retry IDs atomically.
  assert.deepEqual(Object.keys(deps.writes[0]).sort(), ["p_event_id", "p_path", "p_visitor_hash"]);
  assert.match(deps.writes[0].p_visitor_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(deps.writes[0].p_visitor_hash, visitor);
  assert.equal(deps.writes[0].p_event_id, eventId);
});

test("reject private routes, query strings, extra data and oversized streams", async () => {
  for (const path of ["/admin", "/admin/equipo", "/api", "/api/contact", "/blog?email=private", "https://other.test/"]) {
    assert.equal(analyticsEventSchema.safeParse({ event: "page_view", eventId: randomUUID(), path }).success, false);
  }
  const deps = dependencies();
  assert.equal(await captureAnalytics(request({ body: { event: "page_view", eventId: randomUUID(), path: "/", email: "private" } }), visitor, deps), 422);
  assert.equal(await captureAnalytics(request({ body: "x".repeat(513) }), visitor, deps), 413);
  assert.equal(deps.writes.length, 0);
});

test("rate limiting and provider failure do not pretend successful collection", async () => {
  const limited = dependencies({ allowed: false });
  assert.equal(await captureAnalytics(request(), visitor, limited), 429);
  assert.equal(limited.writes.length, 0);
  assert.equal(await captureAnalytics(request(), visitor, dependencies({ throws: true })), 503);
});

test("capture requires the canonical HTTPS production origin", () => {
  const site = "https://castelaochile.vercel.app";
  assert.equal(hasAnalyticsOrigin(request(), site, "production"), true);
  for (const deployment of [undefined, "development", "preview"]) assert.equal(hasAnalyticsOrigin(request(), site, deployment), false);
  assert.equal(hasAnalyticsOrigin(request({ headers: { origin: "https://external.test" } }), site, "production"), false);
  assert.equal(hasAnalyticsOrigin(new Request("http://localhost:3300/api/analytics", { headers: { origin: "http://localhost:3300" } }), "http://localhost:3300", "production"), false);
});

test("comparisons never turn pre-activation zeros into visitor growth", () => {
  const result: WebAnalytics = { visitors: 20, previousVisitors: 10, todayVisitors: 3, totalViews: 40, previousViews: 15, latest: null, startedAt: "2026-10-01T12:00:00Z", startDate: "2026-10-01", today: "2026-10-07", dailyPoints: [], topPages: [] };
  assert.equal(analyticsVariation(result, 7), null);
  assert.equal(analyticsVariation({ ...result, startedAt: "2026-09-01T12:00:00Z" }, 7), 100);
  assert.equal(analyticsVariation({ ...result, previousVisitors: 0 }, 7), null);
  // Santiago is still on the previous local date near midnight UTC.
  assert.equal(analyticsVariation({ ...result, startedAt: "2026-09-24T01:00:00Z" }, 7), 100);
  assert.equal(analyticsVariation({ ...result, startedAt: "2026-09-25T01:00:00Z" }, 7), null);
});
