import { ArrowUpRight, Clock3, ImageOff, UserRound } from "lucide-react";
import Link from "next/link";

import { PublishedCover } from "@/components/content/published-cover";
import type { PublicPostSummary } from "@/lib/repositories/content-repository";

export function PostCard({ post }: { post: PublicPostSummary }) {
  const basePath = post.kind === "news" ? "/noticias" : "/blog";
  const category = post.categories[0]?.name ?? (post.kind === "news" ? "Noticia" : "Blog");
  return <article className="content-post-card">
    {post.coverImagePath
      ? <PublishedCover alt={post.coverAlt || post.title} kind={post.kind} slug={post.slug} />
      : <div aria-label="Artículo sin imagen destacada" className="content-cover content-cover--empty" role="img"><ImageOff aria-hidden="true" size={28} /><span>Castelao Chile</span></div>}
    <div className="content-post-card__body">
      <p className="eyebrow">{category}</p>
      <h2><Link href={`${basePath}/${post.slug}`}>{post.title}</Link></h2>
      <p>{post.summary}</p>
      <div className="content-post-card__meta">
        <time dateTime={post.publishedAt}>{new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(new Date(post.publishedAt))}</time>
        {post.authorName && <span><UserRound aria-hidden="true" size={14} /> {post.authorName}</span>}
        {post.readingTimeMinutes && <span><Clock3 aria-hidden="true" size={14} /> {post.readingTimeMinutes} min</span>}
      </div>
      <Link aria-label={`Leer ${post.title}`} className="content-post-card__link" href={`${basePath}/${post.slug}`}>Leer artículo <ArrowUpRight aria-hidden="true" size={16} /></Link>
    </div>
  </article>;
}
