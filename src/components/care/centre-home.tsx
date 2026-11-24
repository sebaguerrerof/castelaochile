import Link from "next/link";
import { CalendarDays, FileText, HeartHandshake, Plus, UserRound, Users } from "lucide-react";
import { AdminPanel, MetricCard, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { careDirectory, getCareCapabilities } from "@/lib/care/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { staffRoleLabels } from "@/lib/staff-roles";
import type { AdminRole } from "@/types/database";
import { dashboardAlertsSchema } from "@/lib/care/dashboard";

export async function CentreHome({ role }: { role: AdminRole }) {
  const director = role === "superadmin", client = await createServerSupabaseClient();
  const caps = await getCareCapabilities();
  const [directory, alerts, records] = await Promise.all([
    careDirectory(),
    client.rpc("care_dashboard_alerts", { page: 1, state: "open" }),
    client.from("care_session_records").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  if (alerts.error || records.error) throw new Error("No fue posible cargar los pendientes. Actualiza para reintentar.");
  const cards = [
    { href: "/admin/seguimiento", title: director ? "Ver todos los pacientes" : "Mis pacientes", description: "Abre la ficha y encuentra agenda, registros y próximos pasos.", icon: UserRound },
    { href: "/admin/seguimiento/mi-trabajo", title: "Mi agenda y pendientes", description: "Encuentra sesiones, registros por finalizar y acciones asignadas.", icon: CalendarDays },
    { href: "/admin/seguimiento/recovery", title: "Recovery", description: "Revisa actividades, compromisos y evolución semanal.", icon: HeartHandshake },
    ...(director ? [
      { href: "/admin/usuarios", title: "Equipo y usuarios", description: "Invita profesionales y elige Psicólogo, Psiquiatra o Coach Recovery.", icon: Users },
      { href: "/admin/seguimiento/equipo", title: "Asignar pacientes", description: "Vincula cada paciente con sus profesionales responsables.", icon: Users },
    ] : []),
    ...(caps.includes("care.reports.export") ? [{ href: "/admin/seguimiento/informes", title: "Informes", description: "Genera, revisa y descarga informes de seguimiento.", icon: FileText }] : []),
  ];
  return <>
    <PageHeader title={director ? "Panel del centro" : "Mi espacio profesional"} eyebrow={staffRoleLabels[role]}
      description={director ? "Pacientes, equipo y seguimiento en un solo lugar. Tu cuenta de Dirección tiene acceso completo al centro." : "Tu agenda, registros y pacientes asignados, sin configuraciones técnicas."}
      actions={director ? <Link className="admin-button admin-button-primary" href="/admin/pacientes/nuevo" prefetch={false}><Plus size={18} aria-hidden="true"/>Nuevo paciente</Link> : undefined}/>
    <section className="centre-metrics" aria-label="Estado del centro">
      <MetricCard icon={Users} label={director ? "Pacientes del centro" : "Mis pacientes"} value={directory.total} detail="Accesos habilitados y suspendidos"/>
      <Link href="/admin/seguimiento/alertas" prefetch={false}><MetricCard icon={HeartHandshake} label="Alertas abiertas" value={dashboardAlertsSchema.parse(alerts.data).total} detail="Requieren revisión del equipo"/></Link>
      <Link href="/admin/seguimiento/mi-trabajo" prefetch={false}><MetricCard icon={FileText} label="Registros en borrador" value={records.count ?? 0} detail={director ? "Del equipo del centro" : "Dentro de tu alcance"}/></Link>
    </section>
    <AdminPanel title="¿Qué necesitas hacer?" description="Elige una tarea para comenzar.">
      <div className="centre-action-grid">{cards.map(({ href, title, description, icon: Icon }) => <Link className="centre-action" key={href} href={href} prefetch={false}><Icon size={25} aria-hidden="true"/><div><h3>{title}</h3><p>{description}</p></div><span aria-hidden="true">→</span></Link>)}</div>
    </AdminPanel>
    <AdminPanel title={director ? "Pacientes" : "Mis pacientes"} description="Accede directamente a su ficha de seguimiento.">
      {directory.patients.length ? <div className="centre-patient-list">{directory.patients.slice(0, 6).map(patient => <Link key={patient.id} href={`/admin/seguimiento/pacientes/${patient.id}`} prefetch={false}><span><strong>{patient.display_name}</strong><small>Portal {patient.is_active ? "habilitado" : "suspendido"}</small></span><span>Abrir ficha →</span></Link>)}</div> : <StatePanel title={director ? "Todavía no hay pacientes" : "Todavía no tienes pacientes asignados"} description={director ? "Crea el primer paciente y luego asigna a sus profesionales." : "Dirección puede asignarte pacientes desde Equipo y asignaciones."}/>} 
      {directory.total > 6 && <Link className="admin-button admin-button-secondary" href="/admin/seguimiento" prefetch={false}>Ver todos los pacientes</Link>}
    </AdminPanel>
    {director && <p className="care-subtle">Para administrar contenidos, páginas o analítica, utiliza «Sitio web» en el menú.</p>}
  </>;
}
