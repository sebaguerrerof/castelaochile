import Image from "next/image";

import type { ContentKind } from "@/types/database";

export function PublishedCover({ kind, slug, alt }: { kind: ContentKind; slug: string; alt: string }) {
  return <div className="content-cover"><Image alt={alt} height={720} priority={false} src={`/api/public/media/${kind}/${slug}`} width={1280} /></div>;
}
