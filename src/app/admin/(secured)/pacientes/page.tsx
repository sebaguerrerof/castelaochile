import { Mail, Search, Settings2, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { PatientAccessActions } from "@/components/admin/patient-access-actions";
import { PatientCreateForm } from "@/components/admin/patient-create-form";
import { AdminFormDialog } from "@/components/admin/admin-form-dialog";
import { AdminNotice, AdminPanel, FilterTabs, MetricCard, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getLibraryPermissions, portalEnabled } from "@/lib/patient-library/server";
import { hasLibraryCapability } from "@/lib/patient-library/policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createLibraryPatient, inviteLibraryPatient, manageLibraryAction } from "../library-actions";

const invitationLabels: Record<string, string> = {
  pending: "Sin invitación", sending: "Envío en curso", sent: "Enlace enviado", linked: "Cuenta vinculada", failed: "No se pudo enviar",
};
const pageSize = 25;

export default async function PatientsAdminPage({ searchParams }: {
  searchParams: Promise<{ resultado?: string; q?: string; estado?: string; pagina?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const canAccess = hasLibraryCapability(await getLibraryPermissions(), "access");
  if (!canAccess && admin.role !== "superadmin") forbidden();
  if (!portalEnabled()) return <><PageHeader title="Pacientes" description="Gestiona el acceso de los pacientes a su biblioteca." /><StatePanel tone="disabled" title="Portal pendiente de activación" description="El equipo técnico debe completar la configuración del portal antes de crear pacientes." /></>;
  if (!canAccess) return <><PageHeader title="Pacientes" description="Gestiona el acceso de los pacientes a su biblioteca." /><StatePanel title="La gestión de pacientes corresponde a Dirección" description="Consulta tus pacientes asignados desde Seguimiento." action={<Link className="admin-button admin-button-primary" href="/admin/seguimiento" prefetch={false}>Ir a seguimiento</Link>} /></>;

  const client = await createServerSupabaseClient();
  const q = (params.q ?? "").trim().slice(0, 100);
  const estado = ["por-invitar", "habilitados", "suspendidos"].includes(params.estado ?? "") ? params.estado! : "todos";
  const page = Math.min(100000, Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1));
  let query = client.from("patient_profiles").select("id,display_name,email,is_active,invitation_state,auth_user_id", { count: "exact" });
  if (q) {
    // Quote PostgREST values and escape LIKE wildcards so input remains a literal search.
    const pattern = JSON.stringify(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
    query = query.or(`display_name.ilike.${pattern},email.ilike.${pattern}`);
  }
  if (estado === "por-invitar") query = query.eq("is_active", true).in("invitation_state", ["pending", "failed"]);
  if (estado === "habilitados") query = query.eq("is_active", true);
  if (estado === "suspendidos") query = query.eq("is_active", false);
  const [listing, total, active, waiting] = await Promise.all([
    query.order("display_name").order("id").range((page - 1) * pageSize, page * pageSize - 1),
    client.from("patient_profiles").select("id", { count: "exact", head: true }),
    client.from("patient_profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
    client.from("patient_profiles").select("id", { count: "exact", head: true }).eq("is_active", true).in("invitation_state", ["pending", "failed"]),
  ]);
  if ([listing, total, active, waiting].some(result => result.error)) throw new Error("No fue posible cargar los pacientes.");
  const patients = listing.data ?? [];
  const count = listing.count ?? 0;
  const emailsEnabled = process.env.PATIENT_AUTH_EMAILS_ENABLED === "true";
  function href(nextState = estado, nextPage = 1) {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (nextState !== "todos") search.set("estado", nextState);
    if (nextPage > 1) search.set("pagina", String(nextPage));
    return `/admin/pacientes${search.size ? `?${search}` : ""}`;
  }
  return <>
    <PageHeader title="Pacientes" description="Crea pacientes, envía su acceso y controla quién puede entrar al portal." actions={<>
      {admin.role === "superadmin" && <Link className="admin-button admin-button-secondary" href="/admin/usuarios" prefetch={false}><Settings2 aria-hidden="true" size={17} />Equipo y usuarios</Link>}
      <AdminFormDialog title="Nuevo paciente" description="Agrega sus datos y decide si quieres enviarle el acceso ahora." triggerLabel="Nuevo paciente" variant="primary"><PatientCreateForm action={createLibraryPatient} emailsEnabled={emailsEnabled}/></AdminFormDialog>
    </>} />
    {params.resultado === "paciente-guardado" && <AdminNotice>Paciente guardado. No se envió ningún correo. Puedes enviarlo con «Enviar acceso».</AdminNotice>}
    {params.resultado === "acceso-enviado" && <AdminNotice>Se solicitó el envío del enlace al correo del paciente. Si no lo encuentra, pídele revisar spam. La entrega depende del proveedor de correo.</AdminNotice>}
    {params.resultado === "acceso-suspendido" && <AdminNotice>Acceso suspendido. El paciente ya no puede consultar ni descargar materiales, aunque tenga una sesión abierta.</AdminNotice>}
    {params.resultado === "acceso-habilitado" && <AdminNotice>Acceso habilitado. El paciente puede entrar con su contraseña; si necesita una nueva, envíale un enlace.</AdminNotice>}
    <div className="patient-admin-metrics">
      <MetricCard icon={Users} label="Total de pacientes" value={total.count ?? 0} />
      <MetricCard icon={UserCheck} label="Accesos habilitados" value={active.count ?? 0} />
      <MetricCard icon={Mail} label="Por invitar" value={waiting.count ?? 0} />
    </div>
    {!emailsEnabled && <AdminNotice tone="info">El envío de correos está desactivado. Puedes guardar pacientes; el equipo técnico debe habilitar el envío antes de invitarlos.</AdminNotice>}
    <AdminPanel className="patient-admin-list">
      <form className="patient-admin-search admin-form" action="/admin/pacientes" role="search" aria-label="Buscar pacientes">
        <label htmlFor="patient-search">Buscar por nombre o correo<input id="patient-search" name="q" type="search" placeholder="Nombre o correo del paciente" defaultValue={q} maxLength={100} /></label>
        {estado !== "todos" && <input type="hidden" name="estado" value={estado} />}
        <button type="submit" className="admin-button admin-button-secondary"><Search aria-hidden="true" size={17} />Buscar</button>
        {(q || estado !== "todos") && <Link prefetch={false} href="/admin/pacientes" className="patient-admin-clear">Limpiar filtros</Link>}
      </form>
      <div className="admin-filter-bar"><FilterTabs label="Filtrar pacientes por acceso" items={[
        { label: "Todos", active: estado === "todos", href: href("todos") },
        { label: "Por invitar", active: estado === "por-invitar", href: href("por-invitar") },
        { label: "Habilitados", active: estado === "habilitados", href: href("habilitados") },
        { label: "Suspendidos", active: estado === "suspendidos", href: href("suspendidos") },
      ]} /><span className="patient-admin-result-count">{count} {count === 1 ? "paciente" : "pacientes"}{q ? count === 1 ? " encontrado" : " encontrados" : ""}</span></div>
      {!patients.length ? <StatePanel tone={q || estado !== "todos" || page > 1 ? "filter" : "empty"} title={q || estado !== "todos" || page > 1 ? "No hay pacientes con estos filtros" : "Agrega tu primer paciente"} description={q || estado !== "todos" || page > 1 ? "Prueba otro nombre, correo o estado de acceso." : "Solo necesitas su nombre y correo. El paciente creará su contraseña desde el enlace personal."} action={<Link prefetch={false} className="admin-button admin-button-primary" href={q || estado !== "todos" || page > 1 ? "/admin/pacientes" : "/admin/pacientes/nuevo"}>{q || estado !== "todos" || page > 1 ? "Ver todos los pacientes" : "Nuevo paciente"}</Link>} /> : <div className="admin-table-wrap"><table className="admin-table patient-admin-table">
        <caption className="sr-only">Pacientes y acciones de acceso</caption>
        <thead><tr><th scope="col">Paciente</th><th scope="col">Acceso al portal</th><th scope="col">Invitación</th><th scope="col">Acciones</th></tr></thead>
        <tbody>{patients.map(patient => <tr key={patient.id}>
          <td data-label="Paciente"><div className="patient-admin-identity"><span className="admin-avatar" aria-hidden="true">{patient.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{patient.display_name}</strong><small>{patient.email}</small></div></div></td>
          <td data-label="Acceso"><span className="patient-admin-badge" data-tone={patient.is_active ? "success" : "neutral"}>{patient.is_active ? "Habilitado" : "Suspendido"}</span></td>
          <td data-label="Invitación"><span className="patient-admin-badge" data-tone={patient.invitation_state === "failed" ? "error" : ["pending", "sending"].includes(patient.invitation_state) ? "warning" : "neutral"}>{invitationLabels[patient.invitation_state]}</span></td>
          <td data-label="Acciones">{admin.role==="superadmin"&&<Link className="admin-button admin-button-secondary" href={`/admin/seguimiento/pacientes/${patient.id}`} prefetch={false}>Abrir ficha</Link>}<PatientAccessActions patient={patient} emailsEnabled={emailsEnabled} inviteAction={inviteLibraryPatient} statusAction={manageLibraryAction} /></td>
        </tr>)}</tbody>
      </table></div>}
      {count > pageSize && <nav className="admin-pagination" aria-label="Páginas de pacientes"><span>Página {page} de {Math.ceil(count / pageSize)}</span><div className="admin-form-actions">{page > 1 && <Link prefetch={false} href={href(estado, page - 1)}>Anterior</Link>}{page * pageSize < count && <Link prefetch={false} href={href(estado, page + 1)}>Siguiente</Link>}</div></nav>}
    </AdminPanel>
    <p className="patient-admin-footnote">Habilitado indica que el acceso está permitido. Un enlace enviado no confirma que el paciente haya creado su contraseña o ingresado.</p>
  </>;
}
