import { KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { AdminPanel, PageHeader, StatusBadge } from "@/components/admin/admin-ui";
import { PasswordChangeForm } from "@/components/admin/password-change-form";
import { requireAdmin } from "@/lib/auth/admin";

const roleLabels = { editor: "Editor", superadmin: "Superadministrador", viewer: "Solo lectura" } as const;

export default async function AdminProfilePage() {
  const admin = await requireAdmin();
  const email = admin.user.email ?? "Correo no disponible";
  const lastSignIn = admin.user.last_sign_in_at
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(admin.user.last_sign_in_at))
    : "Sin registro disponible";

  return (
    <>
      <PageHeader description="Consulta los datos de tu cuenta y administra tus credenciales sin modificar permisos o roles." eyebrow="Cuenta" title="Mi perfil" />
      <div className="admin-profile-grid">
        <div className="admin-stack">
          <AdminPanel title="Información de la cuenta">
            <div className="admin-profile-avatar"><UserRound aria-hidden="true" size={25} /></div>
            <dl className="admin-definition-list">
              <div><dt>Correo</dt><dd>{email}</dd></div>
              <div><dt>Rol</dt><dd><StatusBadge value={admin.role} /> <span className="sr-only">{roleLabels[admin.role]}</span></dd></div>
              <div><dt>Estado</dt><dd><StatusBadge value="active" /></dd></div>
              <div><dt>Último acceso</dt><dd>{lastSignIn}</dd></div>
              <div><dt>ID técnico</dt><dd><code>{admin.user.id}</code></dd></div>
            </dl>
          </AdminPanel>
          <div className="admin-notice" data-tone="info"><ShieldCheck aria-hidden="true" size={17} /> Tu rol se administra por separado y no puede modificarse desde el perfil.</div>
        </div>
        <AdminPanel description="Se requiere la contraseña actual para confirmar el cambio." title="Seguridad" className="admin-security-panel">
          <span id="seguridad" />
          <div className="admin-security-heading"><KeyRound aria-hidden="true" size={21} /><p>Cambiar contraseña</p></div>
          <PasswordChangeForm email={email} />
        </AdminPanel>
      </div>
    </>
  );
}
