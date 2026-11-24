"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import type { AdminFormAction } from "@/lib/admin-action-state";

export function PatientCreateForm({ action, emailsEnabled }: { action: AdminFormAction; emailsEnabled: boolean }) {
  const [send, setSend] = useState(emailsEnabled);
  return <AdminActionForm action={action} className="admin-form patient-admin-create-form" warnOnUnsavedChanges>
    <label>Nombre del paciente<input name="display_name" required minLength={2} maxLength={100} autoComplete="off" placeholder="Nombre y apellido" /></label>
    <label>Correo del paciente<input name="email" required type="email" maxLength={254} autoComplete="off" placeholder="paciente@correo.cl" aria-describedby="patient-email-help" /></label>
    <p id="patient-email-help" className="admin-form-help">Revisa que sea su correo personal: aquí recibirá el enlace de acceso. Si el correo ya existe, se actualizará el mismo paciente.</p>
    <div className="patient-admin-delivery"><Mail aria-hidden="true" size={20} /><div><label className="admin-inline-check"><input name="send_invitation" type="checkbox" checked={send} onChange={event => setSend(event.target.checked)} disabled={!emailsEnabled} />Enviar acceso por correo ahora</label><p className="admin-form-help">{send ? "El paciente elige su contraseña desde un enlace personal. No necesitas crearla ni conocerla." : "Se guardará el paciente sin enviar correos. Podrás enviarle el acceso desde la lista."}</p></div></div>
    {!emailsEnabled && <p className="admin-form-help">El envío está desactivado en este entorno. Guarda el paciente y solicita al equipo técnico habilitarlo antes de invitar.</p>}
    <div className="admin-form-actions"><AdminSubmitButton pendingLabel={send ? "Creando y enviando…" : "Guardando…"}>{send ? "Crear y enviar acceso" : "Guardar sin enviar"}</AdminSubmitButton><Link className="admin-button admin-button-secondary" href="/admin/pacientes" prefetch={false}>Cancelar</Link></div>
  </AdminActionForm>;
}
