import { CalendarDays, Eye, TrendingUp, Users } from "lucide-react";
import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { AdminNotice, AdminPanel, FilterTabs, MetricCard, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { analyticsVariation } from "@/lib/analytics-report";
import { requireAdmin } from "@/lib/auth/admin";
import { getAnalytics } from "@/lib/repositories/admin-repository";
import { isAnalyticsEnabled } from "@/lib/runtime-config";

const validPeriods = [7, 30, 90] as const;
const formatTimestamp = (value: string) => new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(value));

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin();
  const { period } = await searchParams;
  const days = validPeriods.includes(Number(period) as typeof validPeriods[number]) ? Number(period) : 7;
  const enabled = isAnalyticsEnabled();
  const result = enabled ? await getAnalytics(days).catch(() => null) : null;
  const variation = result ? analyticsVariation(result, days) : null;
  return <>
    <PageHeader actions={<a className="admin-button admin-button-secondary" href={`/admin/analitica?period=${days}`}>Actualizar cifras</a>} description="Visitas del sitio público con consentimiento. Un navegador se cuenta una sola vez dentro del periodo, aunque vuelva varios días. Zona horaria: America/Santiago." eyebrow="Datos reales · Analítica propia" title="Analítica" />
    <div className="admin-filter-bar"><FilterTabs label="Periodo de analítica" items={validPeriods.map((value) => ({ active: days === value, href: `/admin/analitica?period=${value}`, label: `${value} días` }))} /></div>
    {!result ? <StatePanel description={enabled ? "No pudimos consultar las cifras. Vuelve a actualizar; no se muestran datos estimados ni de ejemplo." : "La captura está desactivada. Requiere habilitar ANALYTICS_ENABLED, Supabase y el limitador compartido; los visitantes deben aceptar la analítica."} title={enabled ? "Cifras temporalmente no disponibles" : "Analítica aún no habilitada"} tone={enabled ? "error" : "disabled"} /> : <>
      <section className="admin-metric-grid">
        <MetricCard detail={`Sin duplicar entre páginas o días · ${days} días`} icon={Users} label="Navegadores únicos" value={result.visitors} />
        <MetricCard detail="Cada página visitada; incluye regresos y recargas" icon={Eye} label="Vistas de página" value={result.totalViews} />
        <MetricCard detail={variation === null ? "Aún no hay dos periodos completos comparables" : `Navegadores respecto a los ${days} días anteriores`} icon={TrendingUp} label="Variación de visitantes" value={variation === null ? "—" : `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`} />
        <MetricCard detail="Desde las 00:00, America/Santiago" icon={CalendarDays} label="Navegadores hoy" value={result.todayVisitors} />
      </section>
      <AdminNotice tone="info">Solo se cuentan navegadores que aceptan la analítica. Una persona puede utilizar varios dispositivos y varias personas pueden compartir un navegador. Se excluyen el administrador, robots conocidos, vistas previas y señales de no seguimiento. {result.startedAt ? `Primer evento registrado: ${formatTimestamp(result.startedAt)}.` : "La medición está preparada; aún no hay visitas consentidas registradas."} No se reconstruyen visitas anteriores a la activación.</AdminNotice>
      <div className="admin-dashboard-grid">
        <AdminPanel description={`Vistas y navegadores únicos de cada día. La suma de visitantes diarios puede superar los únicos del periodo. ${result.latest ? `Último evento: ${formatTimestamp(result.latest)}.` : "Sin eventos en este periodo."}`} title="Actividad diaria"><AnalyticsChart points={result.dailyPoints} /></AdminPanel>
        <AdminPanel description="Vistas de cada ruta durante el periodo seleccionado." title="Páginas más vistas">
          {result.topPages.length ? <ol className="admin-ranking">{result.topPages.map((page, index) => <li key={page.path}><span>{index + 1}</span><strong>{page.path}</strong><b>{page.pageViews}</b></li>)}</ol> : <StatePanel description="Las cifras aparecerán cuando los visitantes acepten la analítica y recorran el sitio." title="Sin vistas registradas" />}
        </AdminPanel>
      </div>
    </>}
  </>;
}
