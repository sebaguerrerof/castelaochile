import type { NavigationItem } from "../types/site";
import { legacyNavigationGroup, legacyNavigationGroups } from "./cms/routing.ts";

export type NavigationGroup = { id: string; label: string; items: NavigationItem[] };

/** Group published CMS links without duplicating their labels or visibility. */
export function groupPublicNavigation(items: readonly NavigationItem[], definitions?: readonly { id: string; label: string }[]): NavigationGroup[] {
  const groups: NavigationGroup[] = (definitions ?? legacyNavigationGroups).map(group => ({ ...group, items: [] }));
  for (const item of items) {
    if (item.href === "/") continue;
    const id = item.groupId ?? legacyNavigationGroup(item.href);
    const group = groups.find(group => group.id === id) ?? groups.find(group => group.id === "recursos");
    if (group && !group.items.some(existing => existing.href === item.href)) group.items.push(item);
  }
  const result = groups.filter(group => group.items.length);
  if (definitions) return result;
  return result.map(group => ({ ...group, label: group.items.length === 1 ? group.items[0].label : group.label }))
    .sort((a, b) => Math.min(...a.items.map(item => items.findIndex(candidate => candidate.href === item.href))) - Math.min(...b.items.map(item => items.findIndex(candidate => candidate.href === item.href))));
}

export function isPublicLinkActive(pathname: string, href: string) {
  if (["/tratamiento", "/acompanamiento"].includes(pathname) && ["/tratamiento", "/acompanamiento"].includes(href)) return true;
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}
