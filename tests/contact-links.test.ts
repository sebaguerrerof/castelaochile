import assert from "node:assert/strict";
import test from "node:test";

import {
  emailHref,
  getContactActions,
  phoneHref,
  whatsappHref,
} from "../src/lib/contact-links.ts";

test("creates links only from valid contact values", () => {
  assert.equal(phoneHref("+56 9 1234 5678"), "tel:+56912345678");
  assert.equal(whatsappHref("+56 9 1234 5678"), "https://wa.me/56912345678");
  assert.equal(
    whatsappHref("+56 9 1234 5678", "Hola, quisiera recibir información sobre Instituto Castelao Chile."),
    "https://wa.me/56912345678?text=Hola%2C%20quisiera%20recibir%20informaci%C3%B3n%20sobre%20Instituto%20Castelao%20Chile.",
  );
  assert.equal(emailHref("hola@institutocastelao.cl"), "mailto:hola@institutocastelao.cl");
  assert.equal(phoneHref("invalid"), null);
  assert.equal(whatsappHref("+34 900 505 100"), null);
  assert.equal(whatsappHref("56912345678"), null);
  assert.equal(emailHref("not-an-email"), null);
});

test("hides all contact actions while the Chile configuration is empty", () => {
  assert.deepEqual(
    getContactActions({
      phone: null,
      whatsapp: null,
      email: null,
      streetAddress: null,
      city: null,
      region: null,
      country: null,
      openingHours: null,
      mapsUrl: null,
      socialLinks: { instagram: null, facebook: null, linkedin: null },
    }),
    [],
  );
});
