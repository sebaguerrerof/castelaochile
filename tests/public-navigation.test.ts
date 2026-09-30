import assert from "node:assert/strict";
import test from "node:test";
import { groupPublicNavigation, isPublicLinkActive } from "../src/lib/public-navigation.ts";
import { blockSchemas } from "../src/lib/cms/schemas.ts";

test("public menu preserves only supplied CMS routes and edited labels", () => {
  const groups = groupPublicNavigation([{ href: "/", label: "Inicio" }, { href: "/equipo", label: "Nuestro equipo humano" }, { href: "/blog", label: "Blog" }]);
  assert.deepEqual(groups.map((group) => group.items).flat(), [{ href: "/equipo", label: "Nuestro equipo humano" }, { href: "/blog", label: "Blog" }]);
  assert.equal(groups[0].label, "Nuestro equipo humano");
  assert(!groups.some((group) => group.items.some((item) => item.href === "/instituto")));
});

test("new CMS navigation entries remain reachable in Information", () => {
  const input = [{ href: "/blog" as const, label: "Blog" }, { href: "/nuevo" as const, label: "Nueva página" }];
  const groups = groupPublicNavigation(input);
  assert.deepEqual(groups.find((group) => group.id === "recursos")?.items, input);
  assert.equal(input.length, 2);
});

test("active navigation handles treatment aliases and profile descendants", () => {
  assert(isPublicLinkActive("/tratamiento", "/acompanamiento"));
  assert(isPublicLinkActive("/equipo/marcelo-montiel", "/equipo"));
  assert(!isPublicLinkActive("/equipo-externo", "/equipo"));
  assert(!isPublicLinkActive("/blog", "/"));
});

test("CMS navigation order controls group priority and child ordering", () => {
  const groups = groupPublicNavigation([{ href: "/recovery-40", label: "Recovery 40" }, { href: "/acompanamiento", label: "Tratamiento" }, { href: "/equipo", label: "Equipo" }, { href: "/instituto", label: "Instituto" }]);
  assert.deepEqual(groups.map((group) => group.id), ["tratamiento", "instituto"]);
  assert.deepEqual(groups[0].items.map((item) => item.href), ["/recovery-40", "/acompanamiento"]);
  assert.deepEqual(groups[1].items.map((item) => item.href), ["/equipo", "/instituto"]);
});

test("CMS card destinations are optional and reject unsafe URLs", () => {
  const block = { title: "Servicios", items: [{ title: "Tratamiento", description: "" }] };
  assert(blockSchemas.feature_cards.safeParse(block).success);
  assert(blockSchemas.feature_cards.safeParse({ ...block, items: [{ ...block.items[0], href: "/acompanamiento" }] }).success);
  assert(!blockSchemas.feature_cards.safeParse({ ...block, items: [{ ...block.items[0], href: "javascript:alert(1)" }] }).success);
});
