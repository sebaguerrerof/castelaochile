import Image from "next/image";

import type { ContentKind } from "@/types/database";

export function PublishedCover({ kind, slug, alt, eager = false }: { kind: ContentKind; slug: string; alt: string; eager?: boolean }) {
  return <div className="content-cover"><Image alt={alt} fetchPriority={eager ? "high" : "auto"} height={720} loading={eager ? "eager" : "lazy"} src={`/api/public/media/${kind}/${slug}`} unoptimized width={1280} /></div>;
}
