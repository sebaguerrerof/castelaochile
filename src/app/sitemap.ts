import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { listSitemapPosts } from "@/lib/repositories/content-repository";
import { listCmsSitemap } from "@/lib/cms/repository";

const contentLastModified = new Date("2026-09-23T00:00:00.000Z");
const indexablePaths = ["/blog"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (siteConfig.isReview) return [];
  const staticEntries = indexablePaths.map((path, index) => ({ url: new URL(path, siteConfig.url).toString(), lastModified: contentLastModified, changeFrequency: "monthly" as const, priority: index === 0 ? 1 : 0.7 }));
  const [posts, cms] = await Promise.all([listSitemapPosts(), listCmsSitemap()]);
  return [...staticEntries, ...cms.map((page) => ({ url: new URL(page.path, siteConfig.url).toString(), lastModified: new Date(page.updated_at), changeFrequency: "monthly" as const, priority: page.path === "/" ? 1 : 0.7 })), ...posts.map((post) => ({ url: new URL(`/${post.kind === "news" ? "noticias" : "blog"}/${post.slug}`, siteConfig.url).toString(), lastModified: new Date(post.updated_at), changeFrequency: "monthly" as const, priority: 0.6 }))];
}
