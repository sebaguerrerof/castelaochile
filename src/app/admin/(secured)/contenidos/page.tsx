import { Eye, Pencil, Plus, Search } from "lucide-react";
import Link from "next/link";

import { AdminNotice, AdminPanel, FilterTabs, PageHeader, PrimaryLink, StatePanel, StatusBadge } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminPosts } from "@/lib/repositories/admin-repository";
import type { ContentKind, ContentStatus } from "@/types/database";

export default async function ContentListPage({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string; status?: string; success?: string }> }) {
  const admin = await requireAdmin();
  const { kind, q, status, success } = await searchParams;
  const filter = kind === "blog" || kind === "news" ? kind as ContentKind : undefined;
  const statusFilter = status === "draft" || status === "published" || status === "archived" ? status as ContentStatus : undefined;
  const search = q?.trim().slice(0, 120) || undefined;
  const posts = await listAdminPosts({ kind: filter, query: search, status: statusFilter });
  const canEdit = admin.role !== "viewer";
  const filterHref = (params: { kind?: ContentKind; status?: ContentStatus }) => {
    const values = new URLSearchParams();
    if (params.kind) values.set("kind", params.kind);
    if (params.status) values.set("status", params.status);
    if (search) values.set("q", search);
    const value = values.toString();
    return value ? `/admin/contenidos?${value}` : "/admin/contenidos";
  };

  return <>
    <PageHeader actions={canEdit ? <PrimaryLink href="/admin/contenidos/nuevo"><Plus aria-hidden="true" size={17} /> Nueva entrada</PrimaryLink> : undefined} description="Borradores, publicaciones y archivo editorial consultados desde Supabase con permisos de rol." eyebrow="CMS" title="Blog y noticias" />
    {success === "saved" && <AdminNotice>El contenido fue guardado correctamente.</AdminNotice>}
    {success === "deleted" && <AdminNotice>La entrada fue eliminada.</AdminNotice>}
    <div className="admin-filter-bar">
      <FilterTabs label="Filtrar contenido" items={[
        { active: !filter && !statusFilter, href: filterHref({}), label: "Todo" },
        { active: filter === "blog", href: filterHref({ kind: "blog" }), label: "Blog" },
        { active: filter === "news", href: filterHref({ kind: "news" }), label: "Noticias" },
        { active: statusFilter === "draft", href: filterHref({ status: "draft" }), label: "Borradores" },
        { active: statusFilter === "published", href: filterHref({ status: "published" }), label: "Publicados" },
        { active: statusFilter === "archived", href: filterHref({ status: "archived" }), label: "Archivados" },
      ]} />
      <form className="admin-search" role="search"><input aria-label="Buscar por título o slug" defaultValue={search} name="q" placeholder="Buscar contenido" type="search" />{filter && <input name="kind" type="hidden" value={filter} />}{statusFilter && <input name="status" type="hidden" value={statusFilter} />}<button aria-label="Buscar" className="admin-icon-button" type="submit"><Search aria-hidden="true" size={18} /></button></form>
    </div>
    <AdminPanel className="admin-table-panel">
      {posts.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Entrada</th><th>Tipo</th><th>Estado</th><th>Última modificación</th><th>Publicación</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{posts.map((post) => <tr key={post.id}><td data-label="Entrada"><strong>{post.title}</strong><small>/{post.slug}</small></td><td data-label="Tipo"><StatusBadge value={post.kind} /></td><td data-label="Estado"><StatusBadge value={post.status} /></td><td data-label="Actualizado">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(post.updated_at))}</td><td data-label="Publicación">{post.published_at ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(post.published_at)) : "—"}</td><td data-label="Acciones"><div className="admin-table-actions">{post.status === "published" && <Link aria-label={`Vista previa de ${post.title}`} href={`/admin/contenidos/${post.id}/vista-previa`}><Eye aria-hidden="true" size={16} /> Vista previa</Link>}{canEdit ? <Link aria-label={`Editar ${post.title}`} href={`/admin/contenidos/${post.id}/editar`}><Pencil aria-hidden="true" size={16} /> Editar</Link> : <span>Lectura</span>}</div></td></tr>)}</tbody></table></div> : <StatePanel description={search || filter || statusFilter ? "Prueba con otro término o limpia los filtros aplicados." : "Crea la primera entrada cuando exista contenido editorial aprobado."} title={search || filter || statusFilter ? "No hay resultados para este filtro" : "Aún no hay contenido"} tone={search || filter || statusFilter ? "filter" : "empty"} />}
    </AdminPanel>
  </>;
}
