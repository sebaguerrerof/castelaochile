import { BarChart3, CalendarDays, Eye, TrendingUp } from "lucide-react";

import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { AdminPanel, FilterTabs, MetricCard, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getAnalytics } from "@/lib/repositories/admin-repository";
import { isAnalyticsEnabled } from "@/lib/runtime-config";

const validPeriods = [7, 30, 90] as const;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin();
  const { period } = await searchParams;
  const days = validPeriods.includes(Number(period) as typeof validPeriods[number]) ? Number(period) : 7;
  const enabled = isAnalyticsEnabled();
  const result = enabled ? await getAnalytics(days) : null;
  const totalViews = result?.analytics.reduce((total, row) => total + row.page_views, 0) ?? 0;
  const latest = result?.analytics.at(-1)?.updated_at;
  const variation = result && result.previousViews > 0 ? ((totalViews - result.previousViews) / result.previousViews) * 100 : null;
  return <>
    <PageHeader description="Vistas agregadas first-party, sin medir personas, sesiones, duración ni identificadores persistentes. Zona horaria: America/Santiago." eyebrow="Privacidad por diseño" title="Analítica" />
    <div className="admin-filter-bar"><FilterTabs label="Periodo de analítica" items={validPeriods.map((value) => ({ active: days === value, href: `/admin/analitica?period=${value}`, label: `${value} días` }))} /></div>
    {!result ? <StatePanel description="La implementación y las tablas existen, pero la captura está desactivada hasta validar configuración, rate limit y gate de privacidad. Al habilitarse, esta pantalla utilizará automáticamente los datos reales." title="Analítica aún no habilitada" tone="disabled" /> : <>
      <section className="admin-metric-grid">
        <MetricCard detail={`Periodo de ${days} días`} icon={Eye} label="Vistas de página" value={totalViews} />
        <MetricCard detail={variation === null ? "Sin periodo anterior comparable" : "Respecto del periodo anterior"} icon={TrendingUp} label="Variación" value={variation === null ? "—" : `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`} />
        <MetricCard detail={`Consultas recibidas en ${days} días`} icon={BarChart3} label="Consultas persistidas" value={result.contactCount} />
        <MetricCard detail="America/Santiago" icon={CalendarDays} label="Última actualización" value={latest ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(latest)) : "Sin datos"} />
      </section>
      <div className="admin-dashboard-grid">
        <AdminPanel description="Cada punto representa el total agregado del día." title="Evolución temporal"><AnalyticsChart points={result.dailyPoints} /></AdminPanel>
        <AdminPanel description="Suma por ruta durante el periodo seleccionado." title="Páginas más vistas">
          {result.topPages.length ? <ol className="admin-ranking">{result.topPages.map((page, index) => <li key={page.path}><span>{index + 1}</span><strong>{page.path}</strong><b>{page.pageViews}</b></li>)}</ol> : <StatePanel description="No existen eventos en este periodo." title="Sin vistas registradas" />}
        </AdminPanel>
      </div>
    </>}
  </>;
}
