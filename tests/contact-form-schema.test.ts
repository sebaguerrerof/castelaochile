import assert from "node:assert/strict";
import test from "node:test";

import { parseContactSubmission } from "../src/lib/contact-form-schema.ts";

test("normalizes a valid first-contact submission", () => {
  const result = parseContactSubmission({
    name: "  Ana   Pérez  ",
    email: " ANA@EXAMPLE.TEST ",
    phone: "+56 9 1234 5678",
    message: "  Consulta breve. ",
    consent: true,
    website: "",
  });

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data, {
    name: "Ana Pérez",
    email: "ana@example.test",
    phone: "+56912345678",
    message: "Consulta breve.",
    consent: true,
    website: "",
  });
});

test("rejects missing consent, invalid email and messages over the safe limit", () => {
  const result = parseContactSubmission({
    name: "A",
    email: "not-an-email",
    phone: "phone",
    message: "x".repeat(501),
    consent: false,
  });

  assert.equal(result.success, false);
  if (result.success) return;
  assert.deepEqual(Object.keys(result.errors).sort(), ["consent", "email", "message", "name", "phone"]);
});
