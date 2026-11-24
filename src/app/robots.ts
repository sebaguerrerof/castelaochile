import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  if (siteConfig.isReview) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/pacientes", "/auth"] }], sitemap: `${siteConfig.url}/sitemap.xml` };
}
