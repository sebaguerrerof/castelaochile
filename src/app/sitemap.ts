import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

const contentLastModified = new Date("2026-09-23T00:00:00.000Z");
const indexablePaths = [
  "/",
  "/instituto",
  "/acompanamiento",
  "/nuestro-enfoque",
  "/familias",
  "/preguntas-frecuentes",
  "/contacto",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  // Review deployments stay out of search engines until local content, assets
  // and contact channels receive institutional approval.
  if (siteConfig.isReview) return [];

  return indexablePaths.map((path, index) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified: contentLastModified,
    changeFrequency: "monthly" as const,
    priority: index === 0 ? 1 : 0.7,
  }));
}