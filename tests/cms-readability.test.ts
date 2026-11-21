import assert from "node:assert/strict";
import test from "node:test";
import { adminReturnPath } from "../src/lib/auth/admin-return-path.ts";
import { isLocalEditorialReview } from "../src/lib/cms/local-review.ts";
import { blockSchemas } from "../src/lib/cms/schemas.ts";
import { formatContactNumber } from "../src/lib/format-contact-number.ts";

test("review login returns only to safe admin paths", () => {
  const target = "/admin/vista-previa/paginas/abc";
  assert.equal(adminReturnPath(target), target);
  for (const value of ["https://evil.test", "//evil.test/admin", "/admin/../../evil", "/pacientes", "/admin/login", "\\evil.test", null]) assert.equal(adminReturnPath(value), "/admin");
});
test("the local editorial shortcut cannot expose review routes on hosted deployments", () => {
  assert(isLocalEditorialReview("true", undefined, "localhost:3446"));
  for (const deployment of ["production", "preview"]) assert(!isLocalEditorialReview("true", deployment, "localhost:3446"));
  assert(!isLocalEditorialReview("true", undefined, "www.castelaochile.cl"));
  assert(!isLocalEditorialReview("false", undefined, "localhost:3446"));
});
test("editorial headings remain structured and preserve a mandatory hero heading", () => {
  assert(blockSchemas.hero.safeParse({ title: "Título", subtitle: "Subtítulo del documento" }).success);
  assert(!blockSchemas.hero.safeParse({ title: "Título", showTitle: false }).success);
  assert(blockSchemas.rich_text.safeParse({ title: "Introducción", showTitle: false, html: "<p>Texto completo.</p>" }).success);
});
test("public contact formatting preserves the exact source phone digits", () => {
  const source = "+56 9 3865 0977";
  const formatted = formatContactNumber(source.replaceAll(" ", ""));
  assert.equal(formatted, source);
});
