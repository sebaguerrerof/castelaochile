import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublishedCover } from "@/components/content/published-cover";
import { SafeMarkdown } from "@/components/content/safe-markdown";
import { siteConfig } from "@/config/site";
import { getPublishedPost } from "@/lib/repositories/content-repository";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const post = await getPublishedPost("news", slug);
  if (!post) return { robots: { index: false, follow: false } };
  return { title: post.title, description: post.summary, alternates: { canonical: `/noticias/${post.slug}` }, openGraph: { type: "article", locale: siteConfig.locale, title: post.title, description: post.summary, url: `/noticias/${post.slug}`, publishedTime: post.publishedAt, modifiedTime: post.updatedAt } };
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const post = await getPublishedPost("news", slug); if (!post) notFound();
  return <article className="page-shell article"><header className="page-hero"><p className="eyebrow text-primary">Noticia</p><h1>{post.title}</h1><p>{post.summary}</p><time dateTime={post.publishedAt}>{new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(new Date(post.publishedAt))}</time></header>{post.coverImagePath && <PublishedCover alt={post.coverAlt || post.title} kind="news" slug={post.slug} />}<SafeMarkdown value={post.body} /></article>;
}
