import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHero } from "@/components/shared/page-hero";
import { PublicContentList } from "@/components/content/public-content-list";
import { listPublishedPosts } from "@/lib/repositories/content-repository";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = createPageMetadata({ title: "Noticias", description: "Noticias institucionales publicadas de Instituto Castelao Chile.", path: "/noticias" });

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const { cursor } = await searchParams;
  const page = await listPublishedPosts("news", cursor);
  return <>
    <PageHero description="Actualizaciones publicadas y aprobadas por el equipo editorial." title="Noticias" />
    <Container className="blog-page"><PublicContentList kind="news" page={page} /></Container>
  </>;
}
