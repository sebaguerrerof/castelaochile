import type { Metadata } from "next";

import { PublicContentList } from "@/components/content/public-content-list";
import { listPublishedPosts } from "@/lib/repositories/content-repository";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = createPageMetadata({ title: "Blog", description: "Publicaciones institucionales revisadas de Instituto Castelao Chile.", path: "/blog" });

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const { cursor } = await searchParams;
  const page = await listPublishedPosts("blog", cursor);
  return <section className="page-shell"><header className="page-hero"><p className="eyebrow text-primary">Contenido institucional</p><h1>Blog</h1><p>Material publicado por el equipo editorial del Instituto Castelao Chile.</p></header><PublicContentList kind="blog" page={page} /></section>;
}
