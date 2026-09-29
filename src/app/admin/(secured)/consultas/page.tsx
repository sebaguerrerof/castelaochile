import { Search } from "lucide-react";
import Link from "next/link";

import { AdminPanel, FilterTabs, PageHeader, StatePanel, StatusBadge } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { listConsultations } from "@/lib/repositories/admin-repository";
import type { ContactSubmissionStatus } from "@/types/database";

const statuses: ContactSubmissionStatus[] = ["new", "in_progress", "closed", "spam"];

const statusLabels: Record<ContactSubmissionStatus, string> = { closed: "Cerradas", in_progress: "En progreso", new: "Nuevas", spam: "Spam" };

export default async function ConsultationsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin(["superadmin", "editor"]);
  const { q, status } = await searchParams;
  const currentStatus = statuses.includes(status as ContactSubmissionStatus) ? status as ContactSubmissionStatus : undefined;
  const search = q?.trim().slice(0, 120) || undefined;
  const consultations = await listConsultations({ query: search, status: currentStatus });
  return <>
    <PageHeader description="Bandeja privada de información persistida. No contiene contactos de ejemplo ni datos generados." eyebrow="Datos personales restringidos" title="Consultas" />
    <div className="admin-filter-bar">
      <FilterTabs label="Filtrar consultas por estado" items={[{ active: !currentStatus, href: search ? `/admin/consultas?q=${encodeURIComponent(search)}` : "/admin/consultas", label: "Todas" }, ...statuses.map((item) => ({ active: currentStatus === item, href: `/admin/consultas?status=${item}${search ? `&q=${encodeURIComponent(search)}` : ""}`, label: statusLabels[item] }))]} />
      <form className="admin-search" role="search"><input aria-label="Buscar por nombre o correo" defaultValue={search} name="q" placeholder="Buscar nombre o correo" type="search" />{currentStatus && <input name="status" type="hidden" value={currentStatus} />}<button aria-label="Buscar" className="admin-icon-button" type="submit"><Search aria-hidden="true" size={18} /></button></form>
    </div>
    <AdminPanel className="admin-table-panel">
      {consultations.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Contacto</th><th>Canal</th><th>Recibida</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{consultations.map((item) => <tr key={item.id}><td data-label="Contacto"><strong>{item.name}</strong></td><td data-label="Canal">{item.email}{item.phone && <small>{item.phone}</small>}</td><td data-label="Recibida">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(item.submitted_at))}</td><td data-label="Estado"><StatusBadge value={item.status} /></td><td data-label="Acción"><div className="admin-table-actions"><Link href={`/admin/consultas/${item.id}`}>Gestionar</Link></div></td></tr>)}</tbody></table></div> : <StatePanel description={search || currentStatus ? "Prueba con otro término o limpia los filtros aplicados." : "Cuando se reciba una consulta real aparecerá en esta bandeja."} title={search || currentStatus ? "No hay resultados para este filtro" : "No hay consultas"} tone={search || currentStatus ? "filter" : "empty"} />}
    </AdminPanel>
  </>;
}
