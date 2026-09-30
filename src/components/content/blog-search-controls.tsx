import { Search, X } from "lucide-react";
import Link from "next/link";

import type { BlogCategory } from "@/lib/repositories/content-repository";

export function BlogSearchControls({ categories, query, category }: { categories: BlogCategory[]; query: string; category: string | null }) {
  return <section aria-label="Buscar y filtrar artículos" className="blog-controls">
    <form action="/blog" className="blog-search" role="search">
      <Search aria-hidden="true" size={20} />
      <label className="sr-only" htmlFor="blog-query">Buscar artículos</label>
      <input defaultValue={query} id="blog-query" maxLength={120} name="q" placeholder="Buscar por tema, título o contenido…" type="search" />
      {category && <input name="categoria" type="hidden" value={category} />}
      <button type="submit">Buscar</button>
      {(query || category) && <Link aria-label="Limpiar búsqueda y filtros" className="blog-search__clear" href="/blog"><X aria-hidden="true" size={16} /> Limpiar</Link>}
    </form>
    {categories.length > 0 && <nav aria-label="Categorías del blog" className="blog-category-filter">
      <Link aria-current={!category ? "page" : undefined} className={!category ? "is-active" : undefined} href={query ? `/blog?q=${encodeURIComponent(query)}` : "/blog"}>Todas</Link>
      {categories.map((item) => {
        const params = new URLSearchParams({ categoria: item.slug });
        if (query) params.set("q", query);
        const active = category === item.slug;
        return <Link aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined} href={`/blog?${params}`} key={item.id}>{item.name}<span>{item.postCount}</span></Link>;
      })}
    </nav>}
  </section>;
}
