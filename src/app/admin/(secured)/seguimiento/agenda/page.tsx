import Link from "next/link";
import { forbidden } from "next/navigation";
import { AdminPanel, PageHeader } from "@/components/admin/admin-ui";
import { CareNav } from "@/components/care/care-nav";
import { AgendaDays } from "@/components/care/agenda-days";
import { requireDirection, supervision } from "@/lib/care/decision-server";
import { dashboardDays } from "@/lib/care/dashboard";
import { carePage } from "@/lib/care/policy";
import { careTimestamp } from "@/lib/care/time";

type Search = { dias?: string; pagina?: string; profesional?: string; estado?: string; paciente?: string };
export default async function AgendaPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireDirection(); const search = await searchParams;
  const days = dashboardDays(search.dias), page = carePage(search.pagina);
  const states = { scheduled: "Programadas", completed: "Realizadas", cancelled: "Canceladas" };
  const state = search.estado && search.estado in states ? search.estado : "all";
  const { data, caps } = await supervision({ days, page, mode: "agenda", state, ...(search.profesional ? { professional: search.profesional } : {}), ...(search.paciente ? { pid: search.paciente } : {}) });
  if (!data.team) forbidden();
  const href = (patch: Record<string, string>) => "/admin/seguimiento/agenda?" + new URLSearchParams({ dias: String(days), estado: state, ...(search.profesional ? { profesional: search.profesional } : {}), ...(search.paciente ? { paciente: search.paciente } : {}), ...patch });
  return <><PageHeader title="Agenda del centro" eyebrow="Equipo y pacientes" description="Actividades del equipo organizadas por día, con horarios de Chile y acceso a cada sesión." actions={caps.includes("care.records.create") && caps.includes("care.directory.read") ? <Link href="/admin/seguimiento/agenda/nuevo" prefetch={false} className="admin-button admin-button-primary">Nueva actividad</Link> : undefined} />
    <CareNav compact caps={caps} active="agenda" />
    <form method="get" className="care-search">
      <label>Periodo<select aria-label="Periodo" name="dias" defaultValue={days}><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select></label>
      <label>Profesional<select aria-label="Profesional" name="profesional" defaultValue={search.profesional ?? ""}><option value="">Todo el equipo autorizado</option>{data.professionals.map(p => <option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
      <label>Estado de la actividad<select aria-label="Estado de la actividad" name="estado" defaultValue={state}><option value="all">Todos</option>{Object.entries(states).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      {search.paciente && <input type="hidden" name="paciente" value={search.paciente} />}
      <button className="admin-button admin-button-secondary">Ver agenda</button>{search.profesional && <Link href="/admin/seguimiento/agenda?dias=30" prefetch={false}>Ver todo el equipo</Link>}
    </form>
    <p className="care-subtle">Historial desde {careTimestamp(data.start_at)}. Incluye las actividades de los próximos 7 días. Horarios en Chile.</p>
    <AdminPanel title={`Agenda · ${data.total} ${data.total === 1 ? "participación" : "participaciones"}`} description="Una participación por paciente y actividad, hasta 25 por página. Las sesiones grupales pueden incluir varias participaciones; abre una actividad para ver sus asistentes y gestionarla.">
      <AgendaDays rows={data.rows} />
      <nav className="care-nav" aria-label="Páginas de agenda">{page > 1 && <Link href={href({ pagina: String(page-1) })} prefetch={false}>Anterior</Link>}{data.total > page*25 && <Link href={href({ pagina: String(page+1) })} prefetch={false}>Siguiente</Link>}</nav>
    </AdminPanel>
  </>;
}
