import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { listConsultations } from "@/lib/repositories/admin-repository";
import type { ContactSubmissionStatus } from "@/types/database";

const statuses: ContactSubmissionStatus[] = ["new", "in_progress", "closed", "spam"];

export default async function ConsultationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin(["superadmin", "editor"]);
  const { status } = await searchParams;
  const currentStatus = statuses.includes(status as ContactSubmissionStatus) ? status as ContactSubmissionStatus : undefined;
  const consultations = await listConsultations(currentStatus);
  return <>
    <header className="admin-page-header"><div><p className="eyebrow">Datos personales restringidos</p><h1>Consultas</h1><p>Solo muestra información persistida de forma real. No hay contactos de ejemplo.</p></div></header>
    <nav className="admin-navigation" aria-label="Filtrar consultas"><Link href="/admin/consultas">Todas</Link>{statuses.map((item) => <Link href={`/admin/consultas?status=${item}`} key={item}>{item}</Link>)}</nav>
    <section className="admin-panel admin-table-wrap">
      {consultations.length ? <table className="admin-table"><thead><tr><th>Recibida</th><th>Nombre</th><th>Canal</th><th>Estado</th><th /></tr></thead><tbody>{consultations.map((item) => <tr key={item.id}><td>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(item.submitted_at))}</td><td>{item.name}</td><td>{item.email}{item.phone ? ` · ${item.phone}` : ""}</td><td><span className="admin-status">{item.status}</span></td><td><Link href={`/admin/consultas/${item.id}`}>Gestionar</Link></td></tr>)}</tbody></table> : <p>No hay consultas que coincidan con este filtro.</p>}
    </section>
  </>;
}
