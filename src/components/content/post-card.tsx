import Link from "next/link";

import { PublishedCover } from "@/components/content/published-cover";
import type { PublicPost } from "@/lib/repositories/content-repository";

export function PostCard({ post }: { post: PublicPost }) {
  const basePath = post.kind === "news" ? "/noticias" : "/blog";
  return <article className="content-post-card">{post.coverImagePath && <PublishedCover alt={post.coverAlt || post.title} kind={post.kind} slug={post.slug} />}<p className="eyebrow">{post.kind === "news" ? "Noticia" : "Blog"}</p><h2><Link href={`${basePath}/${post.slug}`}>{post.title}</Link></h2><p>{post.summary}</p><time dateTime={post.publishedAt}>{new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(new Date(post.publishedAt))}</time></article>;
}
