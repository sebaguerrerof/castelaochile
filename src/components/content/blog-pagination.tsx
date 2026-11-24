import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

function visiblePages(current: number, total: number) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  return [...pages].filter((page) => page >= 1 && page <= total).sort((left, right) => left - right);
}

export function BlogPagination({ page, totalPages, query, category }: { page: number; totalPages: number; query: string; category: string | null }) {
  if (totalPages <= 1) return null;
  const href = (target: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("categoria", category);
    if (target > 1) params.set("pagina", String(target));
    return params.size ? `/blog?${params}` : "/blog";
  };
  const pages = visiblePages(page, totalPages);
  return <nav aria-label="Paginación del blog" className="blog-pagination">
    {page > 1 ? <Link href={href(page - 1)} rel="prev"><ChevronLeft aria-hidden="true" size={17} /> Anterior</Link> : <span aria-disabled="true"><ChevronLeft aria-hidden="true" size={17} /> Anterior</span>}
    <ol>{pages.map((item, index) => <li key={item}>{index > 0 && item - pages[index - 1] > 1 && <span aria-hidden="true" className="blog-pagination__ellipsis">…</span>}<Link aria-current={item === page ? "page" : undefined} className={item === page ? "is-active" : undefined} href={href(item)}>{item}<span className="sr-only"> página</span></Link></li>)}</ol>
    {page < totalPages ? <Link href={href(page + 1)} rel="next">Siguiente <ChevronRight aria-hidden="true" size={17} /></Link> : <span aria-disabled="true">Siguiente <ChevronRight aria-hidden="true" size={17} /></span>}
  </nav>;
}
