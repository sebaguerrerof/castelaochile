"use client";

import { Mail, Pause, Play, X } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import type { AdminActionState, AdminFormAction } from "@/lib/admin-action-state";
import type { PatientProfile } from "@/types/patient-library";

type Patient = Pick<PatientProfile, "id" | "display_name" | "email" | "is_active" | "auth_user_id" | "invitation_state">;

export function PatientAccessActions({ patient, emailsEnabled, inviteAction, statusAction }: {
  patient: Patient; emailsEnabled: boolean; inviteAction: AdminFormAction; statusAction: AdminFormAction;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [mode, setMode] = useState<"send" | "status">("send");
  const [state, formAction, pending] = useActionState(async (previous: AdminActionState, data: FormData) => {
    try { return await (mode === "send" ? inviteAction : statusAction)(previous, data); }
    finally { dialog.current?.close(); }
  }, { status: "idle" });
  const sendLabel = patient.auth_user_id ? "Enviar nuevo enlace" : "Enviar acceso";
  const statusLabel = patient.is_active ? "Suspender acceso" : "Habilitar acceso";
  function open(next: "send" | "status") { setMode(next); dialog.current?.showModal(); }
  return <div className="patient-admin-actions">
    <div className="patient-admin-action-buttons">
      {patient.is_active && <button className={`admin-button admin-button-${patient.invitation_state === "pending" || patient.invitation_state === "failed" ? "primary" : "secondary"}`} type="button" onClick={() => open("send")} disabled={!emailsEnabled || pending}><Mail aria-hidden="true" size={16} />{sendLabel}</button>}
      <button className="admin-button patient-admin-status-button" type="button" onClick={() => open("status")} disabled={pending}>{patient.is_active ? <Pause aria-hidden="true" size={15} /> : <Play aria-hidden="true" size={15} />}{statusLabel}</button>
    </div>
    {state.status === "error" && <p className="admin-form-error" role="alert">{state.message}</p>}
    <dialog ref={dialog} className="patient-admin-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { if (pending) event.preventDefault(); }}>
      <div className="patient-admin-dialog-heading"><span className="patient-admin-dialog-icon">{mode === "send" ? <Mail aria-hidden="true" size={22} /> : patient.is_active ? <Pause aria-hidden="true" size={22} /> : <Play aria-hidden="true" size={22} />}</span><button className="admin-icon-button" type="button" aria-label="Cerrar confirmación" disabled={pending} onClick={() => dialog.current?.close()}><X aria-hidden="true" size={18} /></button></div>
      <h2 id={titleId}>{mode === "send" ? sendLabel : statusLabel}</h2>
      <p className="patient-admin-dialog-patient"><strong>{patient.display_name}</strong><span>{patient.email}</span></p>
      <p id={descriptionId}>{mode === "send" ? patient.auth_user_id ? "Le enviaremos un enlace personal para crear o restablecer su contraseña. Su contraseña actual seguirá funcionando hasta que la cambie." : "Le enviaremos un enlace personal para que elija su contraseña y entre al portal." : patient.is_active ? "Dejará de ver y descargar materiales inmediatamente, incluso si tiene una sesión abierta. Puedes habilitarlo nuevamente cuando lo necesites." : "Podrá volver a entrar con su contraseña. Esta acción no envía un correo; puedes enviarle un nuevo enlace después si lo necesita."}</p>
      <form action={formAction} className="admin-form">
        <input type="hidden" name="id" value={patient.id} />
        {mode === "status" && <><input type="hidden" name="op" value="patient_status" />{!patient.is_active && <input type="hidden" name="is_active" value="on" />}</>}
        <div className="admin-form-actions"><button type="button" className="admin-button admin-button-secondary" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</button><AdminSubmitButton variant={mode === "status" && patient.is_active ? "danger" : "primary"} pendingLabel={mode === "send" ? "Enviando…" : "Guardando…"}>{mode === "send" ? "Confirmar envío" : statusLabel}</AdminSubmitButton></div>
      </form>
    </dialog>
  </div>;
}
