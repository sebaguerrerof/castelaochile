import type { Metadata } from "next";

import { PublicContentList } from "@/components/content/public-content-list";
import { listPublishedPosts } from "@/lib/repositories/content-repository";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = createPageMetadata({ title: "Noticias", description: "Noticias institucionales publicadas de Instituto Castelao Chile.", path: "/noticias" });

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const { cursor } = await searchParams;
  const page = await listPublishedPosts("news", cursor);
  return <section className="page-shell"><header className="page-hero"><p className="eyebrow text-primary">Actualidad institucional</p><h1>Noticias</h1><p>Actualizaciones publicadas y aprobadas por el equipo editorial.</p></header><PublicContentList kind="news" page={page} /></section>;
}
