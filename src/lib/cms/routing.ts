/** Public editorial paths only. Application modules retain ownership of their routes. */
export function isCmsPath(value: string): boolean {
  return value.length <= 180 && /^(?:\/|(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){1,5})$/.test(value)
    && !/^\/(?:admin|api|auth|pacientes|blog|noticias|privacidad-analitica|robots|sitemap|favicon|manifest|icon|apple-icon)(?:\/|$)/.test(value)
    && !value.startsWith("/equipo/");
}

export const legacyNavigationGroups = [
  { id: "instituto", label: "Instituto" }, { id: "tratamiento", label: "Tratamientos" },
  { id: "familias", label: "Familias" }, { id: "recursos", label: "Información" }, { id: "contacto", label: "Contacto" },
];

export function legacyNavigationGroup(path: string) {
  if (["/instituto", "/nuestro-enfoque", "/equipo"].includes(path)) return "instituto";
  if (["/acompanamiento", "/tratamiento", "/recovery-40"].includes(path)) return "tratamiento";
  if (path === "/familias") return "familias";
  return path === "/contacto" ? "contacto" : "recursos";
}
