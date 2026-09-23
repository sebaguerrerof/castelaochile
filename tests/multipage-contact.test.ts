import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { navigationItems } from "../src/config/navigation.ts";
import { getLegacyHashRoute } from "../src/lib/legacy-hash-route.ts";
import { whatsappHref } from "../src/lib/contact-links.ts";

const workspace = fileURLToPath(new URL("../", import.meta.url));

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, `file:///${workspace.replace(/\\/g, "/")}`), "utf8");
}

test("the primary navigation exposes all institutional routes", () => {
  assert.deepEqual(
    navigationItems.map((item) => item.href),
    [
      "/",
      "/instituto",
      "/acompanamiento",
      "/nuestro-enfoque",
      "/familias",
      "/preguntas-frecuentes",
      "/contacto",
    ],
  );
  assert.ok(navigationItems.every((item) => !item.href.startsWith("#")));
});

test("legacy one-page fragments resolve to equivalent real routes", () => {
  assert.equal(getLegacyHashRoute("#instituto"), "/instituto");
  assert.equal(getLegacyHashRoute("#acompanamiento"), "/acompanamiento");
  assert.equal(getLegacyHashRoute("#como-trabajamos"), "/nuestro-enfoque");
  assert.equal(getLegacyHashRoute("#preguntas-frecuentes"), "/preguntas-frecuentes");
  assert.equal(getLegacyHashRoute("#contacto"), "/contacto");
  assert.equal(getLegacyHashRoute("#inicio"), null);
});

test("the official WhatsApp channel is centralized and the global action uses the valid wa.me URL", () => {
  assert.equal(whatsappHref("+56938650977"), "https://wa.me/56938650977");
  assert.equal(whatsappHref(null), null);
  assert.equal(whatsappHref("+34 900 505 100"), null);

  const config = source("src/config/contact.ts");
  const component = source("src/components/shared/floating-whatsapp.tsx");
  const layout = source("src/app/layout.tsx");

  assert.match(config, /whatsapp: "\+56938650977"/);
  assert.match(component, /aria-label="Contactar a Instituto Castelao Chile por WhatsApp"/);
  assert.match(component, /target="_blank"/);
  assert.match(component, /rel="noopener noreferrer"/);
  assert.equal((layout.match(/<FloatingWhatsApp/g) ?? []).length, 1);
  assert.doesNotMatch(component, /wa\.me\/null/);
});

test("the isolated fallback stays safe when WhatsApp is intentionally unavailable", () => {
  const component = source("src/components/shared/floating-whatsapp.tsx");

  assert.match(component, /href="\/contacto"/);
  assert.match(component, /WhatsApp próximamente/);
});

test("route, mobile-menu and FAQ motion use reusable progressive-enhancement primitives", () => {
  const template = source("src/app/template.tsx");
  const header = source("src/components/layout/header.tsx");
  const accordion = source("src/components/ui/accordion.tsx");
  const styles = source("src/app/globals.css");

  assert.match(template, /PageTransition/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /aria-current/);
  assert.match(header, /mobile-navigation-panel--closing/);
  assert.match(accordion, /accordion-content/);
  assert.match(styles, /@keyframes page-enter/);
  assert.match(styles, /@keyframes accordion-expand/);
});

test("the visible contact demonstration includes required UI without calling the contact API", () => {
  const form = source("src/components/contact/contact-form.tsx");
  assert.match(form, /Formulario de demostración: todavía no envía ni guarda consultas\./);
  assert.match(form, /name="name"/);
  assert.match(form, /name="email"/);
  assert.match(form, /name="phone"/);
  assert.match(form, /name="message"/);
  assert.match(form, /Envío aún no disponible/);
  assert.match(form, /disabled/);
  assert.doesNotMatch(form, /fetch\s*\(/);
  assert.doesNotMatch(form, /\/api\/contact/);
  assert.doesNotMatch(form, /localStorage/);
});

test("responsive and reduced-motion safeguards keep the floating action available", () => {
  const styles = source("src/app/globals.css");
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /@media \(max-height: 30rem\)[\s\S]*min-height: 2\.8rem/);
  assert.doesNotMatch(styles, /@media \(max-height: 30rem\)\s*\{\s*\.floating-whatsapp\s*\{\s*display: none/);
});