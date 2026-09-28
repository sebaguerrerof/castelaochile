"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithPassword({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      if (signInError) {
        setError("No fue posible iniciar sesión. Revisa tus credenciales o contacta a la persona administradora.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("El acceso administrativo aún no está configurado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-login-form" noValidate onSubmit={submit}>
      <label htmlFor="admin-email">Correo institucional<input autoComplete="email" id="admin-email" name="email" required type="email" /></label>
      <label htmlFor="admin-password">Contraseña<input autoComplete="current-password" id="admin-password" minLength={8} name="password" required type="password" /></label>
      {error && <p className="admin-form-error" role="alert">{error}</p>}
      <button disabled={pending} type="submit">{pending ? "Verificando…" : "Ingresar"}</button>
      <p>Solo personal invitado y con un rol administrativo activo puede acceder. No hay registro público.</p>
    </form>
  );
}
