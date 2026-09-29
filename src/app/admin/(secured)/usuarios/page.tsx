import { inviteStaffMember, updateStaffMember } from "@/app/admin/(secured)/actions";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { AdminNotice, AdminPanel, PageHeader, StatePanel, StatusBadge } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { listStaffUsersWithIdentity } from "@/lib/repositories/admin-repository";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const admin = await requireAdmin(["superadmin"]);
  const { success } = await searchParams;
  const staff = await listStaffUsersWithIdentity();

  return <>
    <PageHeader description="Las identidades provienen de Supabase Auth y los permisos de la tabla protegida admin_users. El correo nunca concede acceso por sí solo." eyebrow="Superadministración" title="Usuarios y roles" />
    {success === "invite" && <AdminNotice>Invitación enviada y rol administrativo registrado.</AdminNotice>}
    {success === "updated" && <AdminNotice>El acceso del usuario fue actualizado.</AdminNotice>}
    <AdminPanel className="admin-invite-panel" description="La persona recibirá un enlace seguro para crear su contraseña." title="Invitar personal">
      <AdminActionForm action={inviteStaffMember} className="admin-form admin-invite-form">
        <label htmlFor="staff-email">Correo institucional<input autoComplete="email" id="staff-email" name="email" required type="email" /></label>
        <label htmlFor="staff-role">Rol<select defaultValue="viewer" id="staff-role" name="role"><option value="viewer">Solo lectura</option><option value="editor">Editor</option><option value="superadmin">Superadministrador</option></select></label>
        <AdminSubmitButton pendingLabel="Enviando invitación…">Enviar invitación</AdminSubmitButton>
      </AdminActionForm>
    </AdminPanel>
    <AdminPanel className="admin-dashboard-section admin-table-panel" title="Accesos existentes">
      {staff.length ? <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Persona</th><th>Rol actual</th><th>Estado</th><th>Último acceso</th><th>Administrar</th></tr></thead>
        <tbody>{staff.map((member) => <tr key={member.user_id}>
          <td data-label="Persona"><strong>{member.displayName}</strong><small>{member.email ?? "Correo no disponible"}</small><small title={member.user_id}>ID · {member.user_id.slice(0, 8)}…</small></td>
          <td data-label="Rol"><StatusBadge value={member.role} /></td>
          <td data-label="Estado"><StatusBadge value={member.is_active ? "active" : "inactive"} /></td>
          <td data-label="Último acceso">{member.lastSignInAt ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(member.lastSignInAt)) : "Sin acceso registrado"}</td>
          <td data-label="Administrar">
            {member.user_id === admin.user.id ? <span className="admin-form-help">Cuenta actual protegida contra auto-revocación.</span> : <AdminActionForm action={updateStaffMember} className="admin-row-form">
              <input name="userId" type="hidden" value={member.user_id} />
              <select aria-label={`Rol de ${member.displayName}`} defaultValue={member.role} name="role"><option value="viewer">Solo lectura</option><option value="editor">Editor</option><option value="superadmin">Superadministrador</option></select>
              <label className="admin-inline-check"><input defaultChecked={member.is_active} name="active" type="checkbox" /> Activo</label>
              <AdminSubmitButton pendingLabel="Guardando…" variant="secondary">Guardar</AdminSubmitButton>
            </AdminActionForm>}
          </td>
        </tr>)}</tbody>
      </table></div> : <StatePanel description="El primer superadministrador se crea mediante el procedimiento manual documentado, no desde esta pantalla." title="No hay perfiles administrativos" />}
    </AdminPanel>
  </>;
}
