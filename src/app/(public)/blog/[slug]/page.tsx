import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/content/post-card";
import { PublishedCover } from "@/components/content/published-cover";
import { SafeHtml } from "@/components/content/safe-html";
import { SafeMarkdown } from "@/components/content/safe-markdown";
import { Container } from "@/components/layout/container";
import { CTASection } from "@/components/shared/cta-section";
import { siteConfig } from "@/config/site";
import { getPublishedPost, listRelatedBlogPosts } from "@/lib/repositories/content-repository";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const post = await getPublishedPost("blog", slug);
  if (!post) return { robots: { index: false, follow: false } };
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.summary;
  const image = post.coverImagePath ? `/api/public/media/blog/${post.slug}` : undefined;
  return {
    title, description, alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", locale: siteConfig.locale, siteName: siteConfig.name, title, description, url: `/blog/${post.slug}`, publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: post.authorName ? [post.authorName] : undefined, section: post.categories[0]?.name, images: image ? [{ url: image, alt: post.coverAlt ?? post.title }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const post = await getPublishedPost("blog", slug); if (!post) notFound();
  const related = await listRelatedBlogPosts(post);
  const canonical = new URL(`/blog/${post.slug}`, siteConfig.url).toString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription ?? post.summary,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: canonical,
    author: { "@type": post.authorName ? "Person" : "Organization", name: post.authorName ?? siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    image: post.coverImagePath ? new URL(`/api/public/media/blog/${post.slug}`, siteConfig.url).toString() : undefined,
  };
  return <>
    <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} type="application/ld+json" />
    <article className="article">
      <Container className="article__container">
        <nav aria-label="Migas de pan" className="article-breadcrumbs"><Link href="/blog">Blog</Link><span aria-hidden="true">/</span><span aria-current="page">Artículo</span></nav>
        <header className="article-header">
          {post.categories.length > 0 && <div className="article-categories">{post.categories.map((category) => <Link href={`/blog?categoria=${encodeURIComponent(category.slug)}`} key={category.slug}>{category.name}</Link>)}</div>}
          <h1>{post.title}</h1>
          <p className="article-header__summary">{post.summary}</p>
          <div className="article-meta"><time dateTime={post.publishedAt}>{new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(new Date(post.publishedAt))}</time>{post.authorName && <span>Por {post.authorName}</span>}{post.readingTimeMinutes && <span>{post.readingTimeMinutes} min de lectura</span>}</div>
        </header>
        {post.coverImagePath && <PublishedCover alt={post.coverAlt || post.title} kind="blog" slug={post.slug} />}
        {post.contentHtml ? <SafeHtml value={post.contentHtml} /> : <SafeMarkdown value={post.body} />}
        {post.origin === "castelao_es" && post.sourceUrl && <aside className="article-source"><p>Contenido editorial publicado originalmente por Instituto Castelao.</p><a href={post.sourceUrl} rel="noopener noreferrer" target="_blank">Ver publicación original</a></aside>}
      </Container>
    </article>
    {related.length > 0 && <section className="related-posts"><Container><p className="eyebrow">También puede interesarte</p><h2>Continúa explorando</h2><div className="blog-grid">{related.map((item) => <PostCard key={item.id} post={item} />)}</div></Container></section>}
    <CTASection description="Encuentra orientación general y los canales institucionales disponibles en Chile." eyebrow="Castelao Chile" href="/contacto" label="Ir a contacto" title="¿Necesitas conversar con nuestro equipo?" />
  </>;
}
