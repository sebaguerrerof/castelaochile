import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BlogGrid } from "@/components/content/blog-grid";
import { BlogPagination } from "@/components/content/blog-pagination";
import { BlogSearchControls } from "@/components/content/blog-search-controls";
import { Container } from "@/components/layout/container";
import { createPageMetadata } from "@/lib/page-metadata";
import { listBlogCategories, listBlogPosts } from "@/lib/repositories/content-repository";

type BlogSearchParams = { q?: string; pagina?: string; categoria?: string };

function parsedPage(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number.parseInt(value, 10);
  return page > 0 && page <= 10_000 ? page : 1;
}

function blogHref({ query, category, page }: { query: string; category: string | null; page: number }) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("categoria", category);
  if (page > 1) params.set("pagina", String(page));
  return params.size ? `/blog?${params}` : "/blog";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<BlogSearchParams> }): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const page = parsedPage(params.pagina);
  const base = createPageMetadata({
    title: query ? `Resultados para “${query}”` : page > 1 ? `Blog — página ${page}` : "Blog y noticias",
    description: "Información, actualidad y recursos editoriales sobre adicciones, tratamiento y recuperación.",
    path: blogHref({ query, category: params.categoria ?? null, page }),
  });
  return query ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<BlogSearchParams> }) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 120) ?? "";
  const category = params.categoria?.trim().slice(0, 160) || null;
  const requestedPage = parsedPage(params.pagina);
  const [page, categories] = await Promise.all([
    listBlogPosts({ query, category, page: requestedPage }),
    listBlogCategories(),
  ]);
  if (page.totalPages > 0 && requestedPage > page.totalPages) redirect(blogHref({ query, category, page: page.totalPages }));

  return <>
    <section className="blog-hero">
      <Container>
        <p className="eyebrow">Blog / Noticias</p>
        <h1>Información para comprender, acompañar y avanzar</h1>
        <p>Actualidad y recursos editoriales sobre adicciones, tratamiento y recuperación, integrados a la experiencia de Castelao Chile.</p>
      </Container>
    </section>
    <Container className="blog-page">
      <BlogSearchControls categories={categories} category={category} query={query} />
      <div aria-live="polite" className="blog-results-summary">{page.total > 0 ? <p><strong>{page.total}</strong> {page.total === 1 ? "artículo" : "artículos"}{query ? ` para “${query}”` : ""}</p> : <p>Sin resultados</p>}</div>
      <BlogGrid page={page} query={query} />
      <BlogPagination category={category} page={page.page} query={query} totalPages={page.totalPages} />
    </Container>
  </>;
}
