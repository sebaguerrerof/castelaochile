import Link from "next/link";

import { listPublishedPosts } from "@/lib/repositories/content-repository";

export async function PublishedContentNavigation() {
  const [blog, news] = await Promise.all([listPublishedPosts("blog"), listPublishedPosts("news")]);
  if (!blog.posts.length && !news.posts.length) return null;
  return <nav aria-label="Contenido publicado" className="public-content-navigation"><span>Contenido publicado</span>{blog.posts.length > 0 && <Link href="/blog">Blog</Link>}{news.posts.length > 0 && <Link href="/noticias">Noticias</Link>}</nav>;
}
