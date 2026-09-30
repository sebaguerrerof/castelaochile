import { Eye, Pencil, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AdminNotice, AdminPanel, PageHeader, PrimaryLink, StatePanel, StatusBadge } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { listAdminCategories, listAdminPosts } from "@/lib/repositories/admin-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ContentKind, ContentOrigin, ContentStatus } from "@/types/database";

export default async function ContentListPage({ searchParams }: { searchParams: Promise<{ categoria?: string; kind?: string; origen?: string; pagina?: string; q?: string; status?: string; success?: string }> }) {
  const admin = await requireAdmin();
  const { categoria, kind, origen, pagina, q, status, success } = await searchParams;
  const filter = kind === "blog" || kind === "news" ? kind as ContentKind : undefined;
  const statusFilter = status === "draft" || status === "published" || status === "archived" ? status as ContentStatus : undefined;
  const originFilter = origen === "castelao_es" || origen === "castelao_cl" ? origen as ContentOrigin : undefined;
  const search = q?.trim().slice(0, 120) || undefined;
  const requestedPage = pagina && /^\d+$/.test(pagina) ? Math.max(1, Number.parseInt(pagina, 10)) : 1;
  const [result, categories] = await Promise.all([listAdminPosts({ category: categoria, kind: filter, origin: originFilter, page: requestedPage, query: search, status: statusFilter }), listAdminCategories()]);
  const imageEntries = await Promise.all(result.posts.filter((post) => post.cover_image_path).map(async (post) => {
    const { data } = await createAdminSupabaseClient().storage.from("content-images").createSignedUrl(post.cover_image_path!, 300);
    return [post.id, data?.signedUrl ?? null] as const;
  }));
  const imageUrls = new Map(imageEntries);
  const canEdit = admin.role !== "viewer";
  const filterHref = (page: number) => {
    const values = new URLSearchParams();
    if (filter) values.set("kind", filter);
    if (statusFilter) values.set("status", statusFilter);
    if (originFilter) values.set("origen", originFilter);
    if (categoria) values.set("categoria", categoria);
    if (search) values.set("q", search);
    if (page > 1) values.set("pagina", String(page));
    return values.size ? `/admin/contenidos?${values}` : "/admin/contenidos";
  };

  return <>
    <PageHeader actions={canEdit && result.schemaReady ? <PrimaryLink href="/admin/contenidos/nuevo"><Plus aria-hidden="true" size={17} /> Nueva entrada</PrimaryLink> : undefined} description="Borradores, publicaciones y archivo editorial consultados desde Supabase con permisos de rol." eyebrow="CMS" title="Blog y noticias" />
    {!result.schemaReady && <AdminNotice tone="info">El módulo está funcionando en modo compatible. Las migraciones del blog todavía deben aplicarse para habilitar categorías, origen, sincronización y edición completa.</AdminNotice>}
    {success === "saved" && <AdminNotice>El contenido fue guardado correctamente.</AdminNotice>}
    {success === "deleted" && <AdminNotice>La entrada fue eliminada.</AdminNotice>}
    <form className="admin-content-filters" role="search"><label>Buscar<input aria-label="Buscar por título, slug o autor" defaultValue={search} name="q" placeholder="Título, slug o autor" type="search" /></label><label>Tipo<select defaultValue={filter ?? ""} name="kind"><option value="">Todos</option><option value="blog">Blog</option><option value="news">Noticias</option></select></label><label>Estado<select defaultValue={statusFilter ?? ""} name="status"><option value="">Todos</option><option value="draft">Borradores</option><option value="published">Publicados</option><option value="archived">Archivados</option></select></label><label>Origen<select defaultValue={originFilter ?? ""} name="origen"><option value="">Todos</option><option value="castelao_es">Castelao España</option><option value="castelao_cl">Castelao Chile</option></select></label><label>Categoría<select defaultValue={categoria ?? ""} name="categoria"><option value="">Todas</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label><button className="admin-button admin-button-secondary" type="submit"><Search aria-hidden="true" size={16} /> Aplicar</button><Link href="/admin/contenidos">Limpiar</Link></form>
    <AdminPanel className="admin-table-panel">
      {result.posts.length ? <><div className="admin-table-wrap"><table className="admin-table admin-content-table"><thead><tr><th>Imagen</th><th>Entrada</th><th>Categoría / autor</th><th>Estado</th><th>Origen</th><th>Publicación</th><th>Actualizado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{result.posts.map((post) => { const postCategories = post.blog_post_categories.map((relation) => relation.blog_categories?.name).filter(Boolean); const imageUrl = imageUrls.get(post.id); return <tr key={post.id}><td data-label="Imagen">{imageUrl ? <Image alt="" className="admin-content-thumbnail" height={56} src={imageUrl} unoptimized width={72} /> : <span className="admin-content-no-image">Sin imagen</span>}</td><td data-label="Entrada"><strong>{post.title}</strong><small>/{post.slug} · {post.reading_time_minutes ? `${post.reading_time_minutes} min` : "lectura pendiente"}</small></td><td data-label="Categoría / autor"><span>{postCategories.join(", ") || "Sin categoría"}</span><small>{post.author_name || "Sin autor"}</small></td><td data-label="Estado"><StatusBadge value={post.status} /></td><td data-label="Origen"><StatusBadge value={post.origin} /></td><td data-label="Publicación">{post.published_at ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(post.published_at)) : "—"}</td><td data-label="Actualizado">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(post.updated_at))}<small>{post.synced_at ? `Sync ${new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(post.synced_at))}` : "Local"}</small></td><td data-label="Acciones"><div className="admin-table-actions"><Link aria-label={`Vista previa de ${post.title}`} href={`/admin/contenidos/${post.id}/vista-previa`}><Eye aria-hidden="true" size={16} /> Preview</Link>{canEdit ? <Link aria-label={`Editar ${post.title}`} href={`/admin/contenidos/${post.id}/editar`}><Pencil aria-hidden="true" size={16} /> Editar</Link> : <span>Lectura</span>}</div></td></tr>; })}</tbody></table></div><nav aria-label="Paginación de contenidos" className="admin-pagination">{result.page > 1 ? <Link href={filterHref(result.page - 1)}>Anterior</Link> : <span aria-disabled="true">Anterior</span>}<span>Página {result.page} de {result.totalPages || 1} · {result.total} resultados</span>{result.page < result.totalPages ? <Link href={filterHref(result.page + 1)}>Siguiente</Link> : <span aria-disabled="true">Siguiente</span>}</nav></> : <StatePanel description={search || filter || statusFilter || originFilter || categoria ? "Prueba con otro término o limpia los filtros aplicados." : "Crea la primera entrada cuando exista contenido editorial aprobado."} title={search || filter || statusFilter || originFilter || categoria ? "No hay resultados para este filtro" : "Aún no hay contenido"} tone={search || filter || statusFilter || originFilter || categoria ? "filter" : "empty"} />}
    </AdminPanel>
  </>;
}
