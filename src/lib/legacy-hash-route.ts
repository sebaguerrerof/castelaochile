import { legacyHashRoutes } from "../config/navigation.ts";

export function getLegacyHashRoute(hash: string) {
  let key = "";
  try {
    key = decodeURIComponent(hash.replace(/^#/, "")).trim();
  } catch {
    return null;
  }

  if (!key) return null;
  return legacyHashRoutes[key as keyof typeof legacyHashRoutes] ?? null;
}