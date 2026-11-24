import assert from "node:assert/strict";
import test from "node:test";

import { organizationJsonLd } from "../src/lib/seo-schema.ts";

const base = { name: "Instituto Castelao Chile", url: "https://www.castelaochile.cl" };

test("organization data carries contact, logo and address when they exist", () => {
  const data = organizationJsonLd({ ...base, email: "contacto@example.cl", whatsapp: "+56938650977", streetAddress: "Av. Irarrázaval 2821", city: "Ñuñoa", region: "Región Metropolitana", country: "Chile" });
  assert.deepEqual(data["@type"], ["Organization", "MedicalBusiness"]);
  assert.equal(data.telephone, "+56938650977");
  assert.equal(data.logo, "https://www.castelaochile.cl/brand/instituto-castelao-vertical.png");
  assert.equal(data.image, "https://www.castelaochile.cl/share/og-default.jpg");
  assert.equal(data.address?.streetAddress, "Av. Irarrázaval 2821");
  assert.equal(data.contactPoint?.[0].telephone, "+56938650977");
});

test("a landline wins over WhatsApp and empty fields are left out", () => {
  const data = organizationJsonLd({ ...base, phone: "+5622000000", whatsapp: "+56938650977", sameAs: ["", undefined] });
  assert.equal(data.telephone, "+5622000000");
  assert.equal("sameAs" in data, false);
  assert.equal("address" in data, false);
  assert.equal("email" in data, false);
});

test("nothing about opening hours or ratings is invented", () => {
  const data = organizationJsonLd(base) as Record<string, unknown>;
  assert.equal("openingHours" in data || "openingHoursSpecification" in data || "aggregateRating" in data, false);
});
