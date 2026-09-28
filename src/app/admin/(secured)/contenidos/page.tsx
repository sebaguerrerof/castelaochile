import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { listAdminPosts } from "@/lib/repositories/admin-repository";
import type { ContentKind } from "@/types/database";

export default async function ContentListPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const admin = await requireAdmin();
  const { kind } = await searchParams;
  const filter = kind === "blog" || kind === "news" ? kind as ContentKind : undefined;
  const posts = await listAdminPosts(filter);
  const canEdit = admin.role !== "viewer";

  return <>
    <header className="admin-page-header">
      <div><p className="eyebrow">CMS</p><h1>Blog y noticias</h1><p>Borradores y contenido publicado se consultan desde Supabase con permisos de rol.</p></div>
      {canEdit && <Link href="/admin/contenidos/nuevo">Nueva entrada</Link>}
    </header>
    <nav className="admin-navigation" aria-label="Filtrar contenido"><Link href="/admin/contenidos">Todo</Link><Link href="/admin/contenidos?kind=blog">Blog</Link><Link href="/admin/contenidos?kind=news">Noticias</Link></nav>
    <section className="admin-panel admin-table-wrap">
      {posts.length ? <table className="admin-table"><thead><tr><th>Título</th><th>Tipo</th><th>Estado</th><th>Actualizado</th><th /></tr></thead><tbody>{posts.map((post) => <tr key={post.id}><td>{post.title}<br /><small>/{post.slug}</small></td><td>{post.kind}</td><td><span className="admin-status">{post.status}</span></td><td>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(post.updated_at))}</td><td>{canEdit ? <Link href={`/admin/contenidos/${post.id}/editar`}>Editar</Link> : "Lectura"}</td></tr>)}</tbody></table> : <p>Aún no hay contenido para este filtro.</p>}
    </section>
  </>;
}
