import assert from "node:assert/strict";
import test from "node:test";
import { cmsPathSchema, settingsSchema } from "../src/lib/cms/schemas.ts";
import { groupPublicNavigation } from "../src/lib/public-navigation.ts";

test("editorial paths support nesting while protecting private and specialized modules", () => {
  for (const path of ["/", "/quienes-somos", "/tratamientos/individual"]) assert(cmsPathSchema.safeParse(path).success);
  for (const path of ["/admin", "/admin/x", "/pacientes", "/api/x", "/auth/confirm", "/blog/x", "/equipo/persona", "//external", "/one/../two", "/one%2ftwo", "/Upper"]) assert(!cmsPathSchema.safeParse(path).success, path);
});
test("CMS group definitions control navigation without a path registry", () => {
  const groups = groupPublicNavigation([{ href: "/programas/nuevo", label: "Programa editable", groupId: "programas" }], [{ id: "programas", label: "Nuestros programas" }]);
  assert.equal(groups[0].label, "Nuestros programas");
  assert.equal(groups[0].items[0].href, "/programas/nuevo");
});
test("global navigation rejects duplicate groups and private destinations", () => {
  const base = { whatsapp: "", phone: "", email: "", streetAddress: "", city: "", region: "", country: "", mapsUrl: "", instagram: "", facebook: "", linkedin: "", evaluationUrl: "/contacto", evaluationLabel: "Evaluación", footerNotice: "Aviso" };
  assert(settingsSchema.safeParse(base).success);
  assert(!settingsSchema.safeParse({ ...base, navigationGroups: [{ id: "uno", label: "Uno" }, { id: "uno", label: "Otro" }] }).success);
  assert(!settingsSchema.safeParse({ ...base, navigationLinks: [{ label: "Privado", href: "/pacientes", groupId: "recursos", enabled: true }] }).success);
});
