import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { navigationItems } from "../src/config/navigation.ts";
import { getLegacyHashRoute } from "../src/lib/legacy-hash-route.ts";
import { whatsappHref } from "../src/lib/contact-links.ts";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const source = (path: string) => readFileSync(new URL(path, `file:///${workspace.replace(/\\/g, "/")}`), "utf8");

test("the primary navigation exposes all institutional routes", () => {
  assert.deepEqual(navigationItems.map((item) => item.href), ["/", "/blog", "/acompanamiento", "/nuestro-enfoque", "/familias", "/preguntas-frecuentes", "/contacto"]);
  assert.ok(navigationItems.every((item) => !item.href.startsWith("#")));
});

test("legacy fragments and WhatsApp resolve safely", () => {
  assert.equal(getLegacyHashRoute("#instituto"), "/instituto");
  assert.equal(getLegacyHashRoute("#contacto"), "/contacto");
  assert.equal(getLegacyHashRoute("#inicio"), null);
  assert.equal(whatsappHref("+56938650977"), "https://wa.me/56938650977");
  assert.equal(whatsappHref("+34 900 505 100"), null);
  const component = source("src/components/shared/floating-whatsapp.tsx");
  assert.match(component, /target="_blank"/); assert.match(component, /rel="noopener noreferrer"/); assert.doesNotMatch(component, /wa\.me\/null/);
});

test("motion and responsive safeguards remain in place", () => {
  const header = source("src/components/layout/header.tsx"); const styles = source("src/app/globals.css");
  assert.match(header, /event\.key !== "Escape"/); assert.match(header, /aria-current/); assert.match(header, /showModal\(\)/); assert.match(styles, /prefers-reduced-motion: reduce/); assert.match(styles, /env\(safe-area-inset-bottom\)/);
});

test("the contact form is real but remains closed until its privacy gate is approved", () => {
  const form = source("src/components/contact/contact-form.tsx"); const route = source("src/app/api/contact/route.ts"); const runtime = source("src/lib/runtime-config.ts");
  assert.match(form, /No envía ni guarda datos/); assert.match(form, /name="name"/); assert.match(form, /name="email"/); assert.match(form, /name="phone"/); assert.match(form, /name="message"/); assert.match(form, /disabled=\{!enabled \|\| pending\}/); assert.match(form, /fetch\("\/api\/contact"/); assert.match(form, /X-Idempotency-Key/); assert.doesNotMatch(form, /localStorage/);
  assert.match(route, /isContactIntakeEnabled\(\)/); assert.match(route, /persistContactSubmission/); assert.match(route, /UpstashRateLimiter/); assert.match(route, /sourcePathSchema/);
  assert.match(runtime, /CONTACT_PRIVACY_POLICY_APPROVED/); assert.match(runtime, /CONTACT_PRIVACY_CONSENT_LABEL/); assert.match(runtime, /hasSharedRateLimitConfig/);
});

test("published CMS and aggregate analytics have no direct browser table writes", () => {
  const content = source("src/lib/repositories/content-repository.ts"); const analytics = source("src/app/api/analytics/route.ts"); const tracker = source("src/components/analytics/analytics-tracker.tsx");
  assert.match(content, /eq\("status", "published"\)/); assert.match(analytics, /createAdminSupabaseClient\(\)\.rpc/); assert.match(tracker, /pathname\.startsWith\("\/admin"\)/); assert.doesNotMatch(tracker, /localStorage/); assert.match(tracker, /consent !== "accepted"/);
});
