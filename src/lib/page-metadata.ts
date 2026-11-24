import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { defaultShareImage } from "@/lib/share-image";
import { buildSeoTitle } from "@/lib/seo-title";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function createPageMetadata({ title: rawTitle, description, path }: PageMetadataInput): Metadata {
  const title = buildSeoTitle(rawTitle, siteConfig.name);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title,
      description,
      url: path,
      images: [defaultShareImage(siteConfig.name)],
    },
    twitter: { card: "summary_large_image", title, description, images: [defaultShareImage(siteConfig.name).url] },
  };
}