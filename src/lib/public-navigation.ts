import type { NavigationItem } from "../types/site";

export type NavigationGroup = { id: string; label: string; items: NavigationItem[] };

/** Group published CMS links without duplicating their labels or visibility. */
export function groupPublicNavigation(items: readonly NavigationItem[]): NavigationGroup[] {
  const groups: NavigationGroup[] = [];
  const definitions = [
    { id: "instituto", label: "Instituto", paths: ["/instituto", "/nuestro-enfoque", "/equipo"] },
    { id: "tratamiento", label: "Tratamientos", paths: ["/acompanamiento", "/tratamiento", "/recovery-40"] },
    { id: "familias", label: "Familias", paths: ["/familias"] },
    { id: "recursos", label: "Información", paths: ["/preguntas-frecuentes", "/blog", "/noticias"] },
    { id: "contacto", label: "Contacto", paths: ["/contacto"] },
  ];
  const assigned = new Set(["/"]);
  for (const definition of definitions) {
    const children = items.filter((item) => definition.paths.includes(item.href) && !assigned.has(item.href));
    children.forEach((item) => assigned.add(item.href));
    if (children.length) groups.push({ id: definition.id, label: children.length === 1 ? children[0].label : definition.label, items: children });
  }
  const additional = items.filter((item) => !assigned.has(item.href));
  if (additional.length) {
    const resources = groups.find((group) => group.id === "recursos");
    if (resources) { resources.items.push(...additional); resources.label = "Información"; }
    else groups.push({ id: "recursos", label: additional.length === 1 ? additional[0].label : "Información", items: [...additional] });
  }
  return groups.sort((a, b) => Math.min(...a.items.map((item) => items.findIndex((candidate) => candidate.href === item.href))) - Math.min(...b.items.map((item) => items.findIndex((candidate) => candidate.href === item.href))));
}

export function isPublicLinkActive(pathname: string, href: string) {
  if (["/tratamiento", "/acompanamiento"].includes(pathname) && ["/tratamiento", "/acompanamiento"].includes(href)) return true;
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}
