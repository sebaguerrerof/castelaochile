import assert from "node:assert/strict";
import test from "node:test";

import { isExternalHref } from "../src/lib/external-link.ts";

test("absolute web addresses are external", () => {
  assert.equal(isExternalHref("https://calendly.com/institutocastelaochile/45min"), true);
  assert.equal(isExternalHref(" http://example.cl "), true);
});

test("site routes, anchors and other schemes are not external", () => {
  assert.equal(isExternalHref("/contacto"), false);
  assert.equal(isExternalHref("/agendar#horarios"), false);
  assert.equal(isExternalHref("mailto:contactochile@institutocastelao.com"), false);
  assert.equal(isExternalHref(""), false);
});
