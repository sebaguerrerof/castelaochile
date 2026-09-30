import { PostCard } from "@/components/content/post-card";
import type { BlogPage } from "@/lib/repositories/content-repository";

export function BlogGrid({ page, query }: { page: BlogPage; query: string }) {
  if (!page.posts.length) return <section className="public-content-empty"><h2>{query ? "No encontramos artículos" : "Aún no hay contenido publicado"}</h2><p>{query ? "Prueba con otra palabra, revisa la ortografía o limpia los filtros." : "Las publicaciones aparecerán aquí cuando hayan sido revisadas y publicadas."}</p></section>;
  return <section aria-label="Artículos" className="blog-grid">{page.posts.map((post) => <PostCard key={post.id} post={post} />)}</section>;
}
