import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { getAnalytics } from "@/lib/repositories/admin-repository";
import { isAnalyticsEnabled } from "@/lib/runtime-config";

const validPeriods = [7, 30, 90] as const;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireAdmin();
  const { period } = await searchParams;
  const days = validPeriods.includes(Number(period) as typeof validPeriods[number]) ? Number(period) : 7;
  const result = await getAnalytics(days);
  const totalViews = result.analytics.reduce((total, row) => total + row.page_views, 0);
  const pages = [...result.analytics].sort((a, b) => b.page_views - a.page_views);
  const latest = result.analytics.at(-1)?.updated_at;
  return <>
    <header className="admin-page-header"><div><p className="eyebrow">Analítica first-party</p><h1>Vistas de páginas</h1><p>Mide visualizaciones agregadas, no personas únicas, sesiones, tiempo de lectura ni identificadores persistentes. Zona horaria: America/Santiago.</p></div></header>
    <nav className="admin-navigation" aria-label="Periodo de analítica">{validPeriods.map((value) => <Link href={`/admin/analitica?period=${value}`} key={value}>{value} días</Link>)}</nav>
    {!isAnalyticsEnabled() ? <section className="admin-panel"><h2>Analítica aún no habilitada</h2><p>El pipeline está implementado, pero la captura permanece desactivada hasta validar la configuración y el gate de privacidad. No se muestran métricas inventadas.</p></section> : <>
      <section className="admin-stat-grid"><article className="admin-stat"><span>Vistas de página ({days} días)</span><strong>{totalViews}</strong></article><article className="admin-stat"><span>Consultas persistidas ({days} días)</span><strong>{result.contactCount}</strong></article><article className="admin-stat"><span>Actualización más reciente</span><strong>{latest ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(latest)) : "Sin datos"}</strong></article></section>
      <section className="admin-panel admin-table-wrap"><h2>Páginas consultadas</h2>{pages.length ? <table className="admin-table"><thead><tr><th>Ruta</th><th>Vistas</th><th>Última actualización</th></tr></thead><tbody>{pages.map((row) => <tr key={`${row.event_date}-${row.path}`}><td>{row.path}</td><td>{row.page_views}</td><td>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(row.updated_at))}</td></tr>)}</tbody></table> : <p>Sin eventos en este periodo.</p>}</section>
    </>}
  </>;
}
