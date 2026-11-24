import { inviteStaffMember, updateStaffMember } from "@/app/admin/(secured)/actions";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { AdminNotice, AdminPanel, PageHeader, StatePanel, StatusBadge } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { listStaffUsersWithIdentity } from "@/lib/repositories/admin-repository";
import { staffRoles, staffRoleLabels, staffRoleDescriptions } from "@/lib/staff-roles";
import Link from "next/link";
import { AdminDialogActions, AdminFormDialog } from "@/components/admin/admin-form-dialog";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const admin = await requireAdmin(["superadmin"]);
  const { success } = await searchParams;
  const staff = await listStaffUsersWithIdentity();

  return <>
    <PageHeader description="Invita a tu equipo y elige su función. Dirección administra todo el centro; cada profesional trabaja con sus pacientes asignados." eyebrow="Dirección del centro" title="Equipo y usuarios" actions={<Link prefetch={false} className="admin-button admin-button-secondary" href="/admin/seguimiento/equipo">Asignar pacientes al equipo</Link>}/>
    {success === "invite" && <AdminNotice>Invitación enviada y rol administrativo registrado.</AdminNotice>}
    {success === "updated" && <AdminNotice>El acceso del usuario fue actualizado.</AdminNotice>}
    <AdminPanel className="admin-invite-panel" description="La persona recibirá un enlace seguro para crear su contraseña." title="Invitar personal" dialog="Invitar al equipo">
      <AdminActionForm action={inviteStaffMember} className="admin-form admin-invite-form">
        <label htmlFor="staff-email">Correo institucional<input autoComplete="email" id="staff-email" name="email" required type="email" /></label>
        <label htmlFor="staff-role">Función en el centro<select defaultValue="psychologist" id="staff-role" name="role">{staffRoles.map(role=><option key={role} value={role}>{staffRoleLabels[role]}</option>)}</select></label>
        <AdminDialogActions><AdminSubmitButton pendingLabel="Enviando invitación…">Enviar invitación</AdminSubmitButton></AdminDialogActions>
      </AdminActionForm>
    </AdminPanel>
    <details className="admin-panel"><summary>Qué puede hacer cada perfil</summary><div className="centre-role-grid">{staffRoles.map(role=><article key={role}><h3>{staffRoleLabels[role]}</h3><p>{staffRoleDescriptions[role]}</p></article>)}</div></details>
    <AdminPanel className="admin-dashboard-section centre-users-panel" title={`Personas del equipo · ${staff.length}`} description="El perfil aplica sus permisos al guardar. Para profesionales, completa la asignación de pacientes; Dirección tiene acceso a todo el centro.">
      {staff.length ? <div className="admin-people-grid">
        {staff.map((member) => <article className="admin-person-card" key={member.user_id}>
          <div className="admin-person-heading"><span className="admin-avatar" aria-hidden="true">{member.displayName.slice(0, 1).toUpperCase()}</span><div><h3>{member.displayName}</h3><p>{member.email ?? "Correo no disponible"}</p></div></div>
          <div className="admin-person-badges"><StatusBadge value={member.role} /><StatusBadge value={member.is_active ? "active" : "inactive"} /></div>
          <p>Último acceso: {member.lastSignInAt ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(member.lastSignInAt)) : "Sin acceso registrado"}</p>
            {member.user_id === admin.user.id ? <p className="admin-form-help">Cuenta actual protegida contra auto-revocación. Dirección tiene acceso completo.</p> : <AdminFormDialog key={`${member.role}-${member.is_active}`} title={`Editar acceso · ${member.displayName}`} description="Al guardar, el rol aplica sus permisos automáticamente." triggerLabel="Editar acceso"><AdminActionForm action={updateStaffMember} className="admin-form">
              <input name="userId" type="hidden" value={member.user_id} />
              <select aria-label={`Rol de ${member.displayName}`} defaultValue={member.role} name="role">{staffRoles.map(role=><option key={role} value={role}>{staffRoleLabels[role]}</option>)}</select>
              <label className="admin-inline-check"><input defaultChecked={member.is_active} name="active" type="checkbox" /> Activo</label>
              <AdminDialogActions><AdminSubmitButton pendingLabel="Guardando…">Guardar</AdminSubmitButton></AdminDialogActions>
            </AdminActionForm></AdminFormDialog>}
        </article>)}
      </div> : <StatePanel description="El primer superadministrador se crea mediante el procedimiento manual documentado, no desde esta pantalla." title="No hay perfiles administrativos" />}
    </AdminPanel>
  </>;
}
