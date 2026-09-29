import type { Metadata } from "next";

import { AdminAccountActivationForm } from "@/components/admin/admin-account-activation-form";
import { BrandLogo } from "@/components/shared/brand-logo";
import { hasSupabasePublicConfig } from "@/lib/runtime-config";

export const metadata: Metadata = { title: "Activar acceso administrativo", robots: { index: false, follow: false } };

export default function AdminAccountActivationPage() {
  return (
    <main className="admin-login-page">
      <section>
        <BrandLogo className="admin-auth-logo" priority />
        <p className="eyebrow">Instituto Castelao Chile</p>
        <h1>Crea o restablece tu contraseña</h1>
        <p>Completa este paso para activar o recuperar tu acceso administrativo.</p>
        {hasSupabasePublicConfig() ? <AdminAccountActivationForm /> : <p className="admin-form-error">Supabase Auth aún no está configurado en este entorno.</p>}
      </section>
    </main>
  );
}
