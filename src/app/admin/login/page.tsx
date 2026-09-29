import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { BrandLogo } from "@/components/shared/brand-logo";
import { hasSupabasePublicConfig } from "@/lib/runtime-config";

export const metadata: Metadata = { title: "Acceso administrativo", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main className="admin-login-page">
      <section>
        <BrandLogo className="admin-auth-logo" priority />
        <p className="eyebrow">Instituto Castelao Chile</p>
        <h1>Acceso administrativo</h1>
        {hasSupabasePublicConfig() ? <AdminLoginForm /> : <p className="admin-form-error">Supabase Auth aún no está configurado en este entorno. No se han creado accesos locales ni de demostración.</p>}
      </section>
    </main>
  );
}
