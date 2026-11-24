import Link from "next/link";

import { PostCard } from "@/components/content/post-card";
import type { PostPage } from "@/lib/repositories/content-repository";
import type { ContentKind } from "@/types/database";

export function PublicContentList({ kind, page }: { kind: ContentKind; page: PostPage }) {
  const basePath = kind === "news" ? "/noticias" : "/blog";
  if (!page.posts.length) return <section className="public-content-empty"><h2>Aún no hay contenido publicado</h2><p>Las entradas aparecerán aquí cuando hayan sido revisadas y publicadas por el equipo editorial.</p></section>;
  return <section className="public-content-list">{page.posts.map((post) => <PostCard key={post.id} post={post} />)}{page.nextCursor && <Link className="button button--secondary" href={`${basePath}?cursor=${encodeURIComponent(page.nextCursor)}`}>Ver más publicaciones</Link>}</section>;
}
