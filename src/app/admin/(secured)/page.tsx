import { Eye, FilePenLine, FileText, Inbox, Newspaper, Plus, Users } from "lucide-react";
import Link from "next/link";

import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { AdminPanel, MetricCard, PageHeader, PrimaryLink, StatePanel, StatusBadge } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getAnalytics, getDashboardOverview } from "@/lib/repositories/admin-repository";
import { isAnalyticsEnabled, isContactIntakeEnabled } from "@/lib/runtime-config";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const analyticsEnabled = isAnalyticsEnabled();
  const intakeEnabled = isContactIntakeEnabled();
  const includeConsultations = admin.role !== "viewer";
  const [overview, analytics] = await Promise.all([
    getDashboardOverview({ includeAnalytics: false, includeConsultations }),
    analyticsEnabled ? getAnalytics(7).catch(() => null) : Promise.resolve(null),
  ]);
  const formatDate = (value: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(value));

  return (
    <>
      <PageHeader description="Panorama operativo con información real del CMS, consultas y analítica first-party." eyebrow="Panel privado" title="Resumen" />
      <section className="admin-metric-grid" aria-label="Indicadores reales">
        <MetricCard detail="Con consentimiento · America/Santiago" icon={Users} label="Navegadores hoy" value={analytics?.todayVisitors ?? "—"} />
        <MetricCard detail="Sin duplicar entre días o páginas" icon={Users} label="Navegadores únicos (7 días)" value={analytics?.visitors ?? "—"} />
        <MetricCard detail="Vistas consentidas de los últimos 7 días" icon={Eye} label="Vistas 7 días" value={analytics?.totalViews ?? "—"} />
        {includeConsultations && <MetricCard detail={intakeEnabled ? "Pendientes de revisión" : "Recepción pública desactivada"} icon={Inbox} label="Consultas nuevas" value={intakeEnabled ? overview.newConsultations : "—"} />}
        <MetricCard detail="Pendientes de publicación" icon={FilePenLine} label="Borradores" value={overview.drafts} />
        <MetricCard detail="Visibles en el sitio público" icon={Newspaper} label="Publicados" value={overview.published} />
      </section>
      <div className="admin-dashboard-grid">
        <AdminPanel description="Solo visitas con consentimiento. Consulta el detalle en Analítica." title="Actividad de los últimos 7 días">
          {analytics ? <><AnalyticsChart points={analytics.dailyPoints} /><Link className="admin-button admin-button-secondary" href="/admin/analitica">Ver analítica completa</Link></> : <StatePanel description={analyticsEnabled ? "Las cifras no están disponibles temporalmente. Actualiza para reintentar." : "La captura está desactivada por configuración."} title={analyticsEnabled ? "Cifras no disponibles" : "Analítica aún no habilitada"} tone={analyticsEnabled ? "error" : "disabled"} />}
        </AdminPanel>
        <div className="admin-stack">
          <AdminPanel title="Acciones rápidas">
            <div className="admin-stack">
              {admin.role !== "viewer" && <PrimaryLink href="/admin/contenidos/nuevo"><Plus aria-hidden="true" size={17} /> Nueva entrada</PrimaryLink>}
              {includeConsultations && <Link className="admin-button admin-button-secondary" href="/admin/consultas"><Inbox aria-hidden="true" size={17} /> Ver consultas</Link>}
              {admin.role === "superadmin" && <Link className="admin-button admin-button-secondary" href="/admin/usuarios"><Users aria-hidden="true" size={17} /> Gestionar usuarios</Link>}
            </div>
          </AdminPanel>
          <AdminPanel title="Contenido reciente">
            {overview.recentPosts.length ? <ul className="admin-list">{overview.recentPosts.map((post) => <li className="admin-list-item" key={post.id}><span className="admin-list-item-copy"><strong>{post.title}</strong><small>{formatDate(post.updated_at)} · <StatusBadge value={post.status} /></small></span><Link href={`/admin/contenidos/${post.id}/editar`}>Abrir</Link></li>)}</ul> : <StatePanel description="Cuando se cree contenido aparecerá aquí." icon={FileText} title="Sin contenido" />}
          </AdminPanel>
        </div>
      </div>
      {includeConsultations && <AdminPanel className="admin-dashboard-section" title="Últimas consultas">
        {overview.recentConsultations.length ? <ul className="admin-list">{overview.recentConsultations.map((item) => <li className="admin-list-item" key={item.id}><span className="admin-list-item-copy"><strong>{item.name}</strong><small>{item.email} · {formatDate(item.submitted_at)}</small></span><span className="admin-list-item-copy"><StatusBadge value={item.status} /><Link href={`/admin/consultas/${item.id}`}>Gestionar</Link></span></li>)}</ul> : <StatePanel description={intakeEnabled ? "Todavía no se han recibido consultas." : "La bandeja está preparada, pero la recepción pública permanece cerrada."} title={intakeEnabled ? "No hay consultas" : "Recepción aún no habilitada"} tone={intakeEnabled ? "empty" : "disabled"} />}
      </AdminPanel>}
    </>
  );
}
