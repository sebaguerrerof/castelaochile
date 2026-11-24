"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ActivationState = "checking" | "ready" | "invalid";

export function AdminAccountActivationForm() {
  const router = useRouter();
  const [state, setState] = useState<ActivationState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    void createBrowserSupabaseClient().auth.getUser().then(({ data, error: userError }) => {
      if (!mounted) return;
      setState(userError || !data.user ? "invalid" : "ready");
    });
    return () => { mounted = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state !== "ready") return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: updateError } = await createBrowserSupabaseClient().auth.updateUser({ password });
      if (updateError) {
        setError("No fue posible crear la contraseña. Solicita un enlace nuevo si este venció.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("No fue posible validar este enlace. Solicita uno nuevo.");
    } finally {
      setPending(false);
    }
  }

  if (state === "checking") return <p>Validando invitación segura…</p>;
  if (state === "invalid") return <p className="admin-form-error" role="alert">Este enlace no es válido o ya venció. Solicita uno nuevo a la persona administradora.</p>;

  return (
    <form className="admin-login-form" noValidate onSubmit={submit}>
      <label htmlFor="admin-new-password">Crea una contraseña<input autoComplete="new-password" id="admin-new-password" minLength={8} name="password" required type="password" /></label>
      <label htmlFor="admin-confirm-password">Confirma tu contraseña<input autoComplete="new-password" id="admin-confirm-password" minLength={8} name="confirmation" required type="password" /></label>
      {error && <p className="admin-form-error" role="alert">{error}</p>}
      <button disabled={pending} type="submit">{pending ? "Creando acceso…" : "Crear contraseña y continuar"}</button>
      <p>Este paso solo aparece después de validar una invitación o un enlace de recuperación personal.</p>
    </form>
  );
}
