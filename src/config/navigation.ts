import type { NavigationItem } from "../types/site.ts";

export const navigationItems: readonly NavigationItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/instituto", label: "Instituto" },
  { href: "/acompanamiento", label: "Acompañamiento" },
  { href: "/nuestro-enfoque", label: "Nuestro enfoque" },
  { href: "/familias", label: "Familias" },
  { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { href: "/contacto", label: "Contacto" },
];

/**
 * Destinos equivalentes para los enlaces por ancla de la versión de una sola
 * página. Los fragmentos no llegan al servidor, por eso se resuelven en la
 * home antes de que una persona quede en un destino vacío.
 */
export const legacyHashRoutes = {
  instituto: "/instituto",
  acompanamiento: "/acompanamiento",
  "como-trabajamos": "/nuestro-enfoque",
  "preguntas-frecuentes": "/preguntas-frecuentes",
  contacto: "/contacto",
} as const;
