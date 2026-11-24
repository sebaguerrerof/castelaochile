import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminNotice, AdminPanel, PageHeader } from "@/components/admin/admin-ui";

export default async function EditorialReview() {
  await requireAdmin();
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("cms_editorial_drafts").select("kind,resource_id,data,updated_at").order("kind");
  if (error) throw new Error("No fue posible cargar la revisión editorial.");
  return <><PageHeader eyebrow="CMS" title="Revisión editorial" description="Contenido preparado en privado. Edita y revisa antes de publicar." /><AdminNotice>Guardar borradores no modifica páginas, perfiles ni configuración publicados.</AdminNotice><AdminPanel title="Borradores pendientes">
    {data.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Contenido</th><th>Tipo</th><th>Acciones</th></tr></thead><tbody>{data.map(row => {
      const content = row.data as Record<string, unknown>;
      const base = row.kind === "page" ? `/admin/paginas/${row.resource_id}` : row.kind === "professional" ? `/admin/equipo/${row.resource_id}` : "/admin/configuracion";
      return <tr key={row.kind + row.resource_id}><td>{String(content.title ?? content.full_name ?? "Configuración institucional")}</td><td>{row.kind === "page" ? "Página" : row.kind === "professional" ? "Profesional" : "Configuración"}</td><td><div className="admin-form-actions"><Link href={base}>Editar</Link>{row.kind !== "settings" && <Link href={`${base}/vista-previa`}>Vista previa</Link>}</div></td></tr>;
    })}</tbody></table></div> : <p>No hay borradores editoriales pendientes.</p>}
  </AdminPanel></>;
}
