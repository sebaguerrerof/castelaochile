import Link from "next/link";

import { PublishedCover } from "@/components/content/published-cover";
import { Container } from "@/components/layout/container";
import type { PublicPostSummary } from "@/lib/repositories/content-repository";

export function ArticleHero({ post }: { post: PublicPostSummary }) {
  const indexHref = post.kind === "blog" ? "/blog" : "/noticias";
  return (
    <header className={`article-hero${post.coverImagePath ? " article-hero--image" : ""}`}>
      {post.coverImagePath && <PublishedCover alt={post.coverAlt || post.title} eager kind={post.kind} slug={post.slug} />}
      <Container className="article-hero__content">
        <nav aria-label="Migas de pan" className="article-breadcrumbs">
          <Link href="/">Inicio</Link><span aria-hidden="true">/</span>
          <Link href={indexHref}>{post.kind === "blog" ? "Blog" : "Noticias"}</Link>
          <span aria-hidden="true">/</span><span aria-current="page">Artículo</span>
        </nav>
        {post.categories.length > 0 && <div className="article-categories">{post.categories.map((category) => <Link href={`/blog?categoria=${encodeURIComponent(category.slug)}`} key={category.slug}>{category.name}</Link>)}</div>}
        <h1>{post.title}</h1>
        <p className="article-hero__label">Instituto Castelao · Chile</p>
      </Container>
    </header>
  );
}

export function ArticleIntroduction({ post }: { post: PublicPostSummary }) {
  return (
    <div className="article-introduction">
      <div className="article-meta">
        {post.authorName && <span>Por <strong>{post.authorName}</strong></span>}
        <time dateTime={post.publishedAt}>{new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(new Date(post.publishedAt))}</time>
        {post.readingTimeMinutes && <span>{post.readingTimeMinutes} min de lectura</span>}
      </div>
      {post.summary && <p className="article-header__summary">{post.summary}</p>}
    </div>
  );
}
