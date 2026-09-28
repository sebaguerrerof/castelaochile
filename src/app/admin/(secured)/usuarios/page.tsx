import { inviteStaffMember, updateStaffMember } from "@/app/admin/(secured)/actions";
import { requireAdmin } from "@/lib/auth/admin";
import { listStaffUsers } from "@/lib/repositories/admin-repository";

export default async function UsersPage() {
  await requireAdmin(["superadmin"]);
  const staff = await listStaffUsers();

  return <>
    <header className="admin-page-header">
      <div>
        <p className="eyebrow">Superadministración</p>
        <h1>Usuarios y roles</h1>
        <p>Las invitaciones usan Supabase Auth y el rol se persiste en la tabla protegida. No se concede acceso por correo ni metadata.</p>
      </div>
    </header>
    <section className="admin-panel">
      <h2>Invitar personal</h2>
      <form action={inviteStaffMember} className="admin-form">
        <label>Correo institucional<input autoComplete="email" name="email" required type="email" /></label>
        <label>Rol<select defaultValue="viewer" name="role"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="superadmin">Superadmin</option></select></label>
        <button type="submit">Enviar invitación</button>
      </form>
    </section>
    <section className="admin-panel admin-table-wrap">
      <h2>Accesos existentes</h2>
      {staff.length ? <table className="admin-table">
        <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Actualizar</th></tr></thead>
        <tbody>{staff.map((member) => <tr key={member.user_id}>
          <td><code>{member.user_id}</code></td>
          <td>{member.role}</td>
          <td>{member.is_active ? "Activo" : "Revocado"}</td>
          <td>
            <form action={updateStaffMember}>
              <input name="userId" type="hidden" value={member.user_id} />
              <select defaultValue={member.role} name="role"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="superadmin">Superadmin</option></select>
              <label className="admin-inline-check"><input defaultChecked={member.is_active} name="active" type="checkbox" /> Acceso activo</label>
              <button type="submit">Guardar</button>
            </form>
          </td>
        </tr>)}</tbody>
      </table> : <p>No hay perfiles administrativos. El primer superadmin se crea mediante el procedimiento manual documentado, no desde esta pantalla.</p>}
    </section>
  </>;
}
