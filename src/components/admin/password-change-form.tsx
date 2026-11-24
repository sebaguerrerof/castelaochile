"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function PasswordChangeForm({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    setMessage(null);
    if (password.length < 12) {
      setMessage({ tone: "error", text: "La nueva contraseña debe tener al menos 12 caracteres." });
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setMessage({ tone: "error", text: "Incluye mayúsculas, minúsculas y al menos un número." });
      return;
    }
    if (password !== confirmation) {
      setMessage({ tone: "error", text: "Las contraseñas nuevas no coinciden." });
      return;
    }
    if (currentPassword === password) {
      setMessage({ tone: "error", text: "La nueva contraseña debe ser distinta de la actual." });
      return;
    }

    setPending(true);
    try {
      const { error } = await createBrowserSupabaseClient().auth.updateUser({
        current_password: currentPassword,
        password,
      });
      if (error) {
        setMessage({ tone: "error", text: "No fue posible cambiar la contraseña. Revisa la contraseña actual y vuelve a intentarlo." });
        return;
      }
      form.reset();
      setMessage({ tone: "success", text: "Contraseña actualizada correctamente." });
    } catch {
      setMessage({ tone: "error", text: "Ocurrió un problema de conexión. La contraseña no fue modificada." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-form" noValidate onSubmit={submit}>
      <label htmlFor="profile-email">Correo de la cuenta<input autoComplete="username" disabled id="profile-email" type="email" value={email} /></label>
      <label htmlFor="current-password">Contraseña actual<input autoComplete="current-password" id="current-password" name="currentPassword" required type="password" /></label>
      <div className="admin-form-grid">
        <label htmlFor="new-password">Nueva contraseña<input autoComplete="new-password" id="new-password" minLength={12} name="password" required type="password" /></label>
        <label htmlFor="confirm-password">Confirmar contraseña<input autoComplete="new-password" id="confirm-password" minLength={12} name="confirmation" required type="password" /></label>
      </div>
      <p className="admin-form-help">Usa al menos 12 caracteres, con mayúsculas, minúsculas y números. La verificación se realiza mediante Supabase Auth.</p>
      {message && <div className="admin-notice" data-tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>{message.tone === "success" && <CheckCircle2 aria-hidden="true" size={16} />} {message.text}</div>}
      <div className="admin-form-actions"><button className="admin-button admin-button-primary" disabled={pending} type="submit">{pending && <LoaderCircle aria-hidden="true" className="admin-spin" size={16} />}{pending ? "Actualizando…" : "Cambiar contraseña"}</button></div>
    </form>
  );
}
