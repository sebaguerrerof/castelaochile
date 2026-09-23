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

test("WhatsApp remains safe while pending and produces a wa.me link only for valid Chilean data", () => {
  assert.equal(whatsappHref(null), null);
  assert.equal(whatsappHref("+34 900 505 100"), null);
  assert.equal(whatsappHref("+56 9 1234 5678"), "https://wa.me/56912345678");

  const component = source("src/components/shared/floating-whatsapp.tsx");
  assert.match(component, /href="\/contacto"/);
  assert.match(component, /WhatsApp próximamente/);
  assert.doesNotMatch(component, /wa\.me\/null/);
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