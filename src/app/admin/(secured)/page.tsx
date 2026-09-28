import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getDashboardCounts } from "@/lib/repositories/admin-repository";
import { getEditorialDashboardCounts } from "@/lib/repositories/admin-dashboard-repository";
import { isAnalyticsEnabled, isContactIntakeEnabled } from "@/lib/runtime-config";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const editorData = await getEditorialDashboardCounts();
  const consultationData = admin.role === "viewer" ? null : await getDashboardCounts();
  return (
    <>
      <header className="admin-page-header"><div><p className="eyebrow">Panel privado</p><h1>Resumen operativo</h1><p>Datos provenientes de Supabase. Si una integración está cerrada por privacidad, se muestra como tal.</p></div></header>
      <section className="admin-stat-grid" aria-label="Indicadores reales">
        <article className="admin-stat"><span>Borradores</span><strong>{editorData.drafts}</strong></article>
        <article className="admin-stat"><span>Vistas de página hoy</span><strong>{isAnalyticsEnabled() ? editorData.todayViews : "No habilitada"}</strong></article>
        {consultationData && <article className="admin-stat"><span>Consultas nuevas</span><strong>{isContactIntakeEnabled() ? consultationData.newConsultations : "No habilitado"}</strong></article>}
      </section>
      <section className="admin-grid">
        <article className="admin-panel"><h2>Contenido</h2><p>Crea borradores, revísalos y publícalos cuando cuenten con aprobación editorial.</p><Link href="/admin/contenidos">Gestionar contenidos</Link></article>
        {admin.role !== "viewer" && <article className="admin-panel"><h2>Consultas</h2><p>{isContactIntakeEnabled() ? "Bandeja privada de consultas persistidas." : "La bandeja está preparada; la recepción pública permanece cerrada."}</p><Link href="/admin/consultas">Ver consultas</Link></article>}
      </section>
    </>
  );
}
