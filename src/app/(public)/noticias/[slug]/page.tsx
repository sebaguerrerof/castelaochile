import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleHero, ArticleIntroduction } from "@/components/content/article-hero";
import { Container } from "@/components/layout/container";
import { SafeHtml } from "@/components/content/safe-html";
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
  return <article className="article"><ArticleHero post={post} /><Container className="article__container"><ArticleIntroduction post={post} />{post.contentHtml ? <SafeHtml value={post.contentHtml} /> : <SafeMarkdown value={post.body} />}</Container></article>;
}
