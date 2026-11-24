"use client";

import { ClipboardPen, Pencil, Plus, X } from "lucide-react";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";

const DialogClose = createContext<(() => void) | null>(null);

/** Keeps cancellation inside the same dirty/pending guard as Escape and the close icon. */
export function AdminDialogActions({ children }: { children: React.ReactNode }) {
  const close = useContext(DialogClose);
  const { pending } = useFormStatus();
  if (!close) return children;
  return <div className="admin-dialog-actions"><button type="button" className="admin-button admin-button-secondary" disabled={pending} onClick={close}>Cancelar</button>{children}</div>;
}

/** Presentation only: the original form and its server action remain the owner of saving. */
export function AdminFormDialog({ children, title, description, triggerLabel, variant = "secondary", wide = false }: {
  children: React.ReactNode;
  title: string;
  description?: string;
  triggerLabel: string;
  variant?: "primary" | "secondary";
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dirty = useRef(false);
  const [open, setOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const titleId = useId(), descriptionId = useId();
  const pathname = usePathname(), search = useSearchParams().toString();
  const location = `${pathname}?${search}`;
  const previousLocation = useRef(location);

  useEffect(() => {
    if (previousLocation.current !== location) dialog.current?.close();
    previousLocation.current = location;
  }, [location]);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const guard = (event: BeforeUnloadEvent) => { if (dirty.current) event.preventDefault(); };
    const saved = () => { dirty.current = false; element?.close(); };
    window.addEventListener("beforeunload", guard);
    element?.addEventListener("admin-form-saved", saved);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("beforeunload", guard);
      element?.removeEventListener("admin-form-saved", saved);
    };
  }, [open]);

  function requestClose() {
    if (dialog.current?.querySelector('form[aria-busy="true"]')) return;
    if (dirty.current) { setConfirmClose(true); return; }
    dialog.current?.close();
  }

  return <div className="admin-dialog-control">
    <button ref={trigger} type="button" className={`admin-button admin-button-${variant}`} aria-haspopup="dialog" onClick={() => {
      setConfirmClose(false); dialog.current?.showModal(); setOpen(true);
      dialog.current?.querySelector<HTMLElement>('input:not([type="hidden"]):not([type="checkbox"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)')?.focus({ preventScroll: true });
    }}>{triggerLabel.startsWith("Editar") ? <Pencil size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{triggerLabel}</button>
    <dialog ref={dialog} className={`admin-form-dialog${wide ? " admin-form-dialog--wide" : ""}`} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      onChangeCapture={() => { dirty.current = true; }}
      onInputCapture={() => { dirty.current = true; }}
      onKeyDown={event => {
        if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey) return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length > 0);
        if (!controls.length) return;
        const current = controls.indexOf(document.activeElement as HTMLElement);
        const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
        event.preventDefault();
        controls[next]?.focus({ preventScroll: true });
        controls[next]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      }}
      onCancel={event => { event.preventDefault(); requestClose(); }}
      onClose={() => { setOpen(false); setConfirmClose(false); trigger.current?.focus(); }}>
      <header className="admin-dialog-header"><span className="admin-dialog-symbol" aria-hidden="true"><ClipboardPen size={22}/></span><div><p className="admin-eyebrow">Castelao Chile</p><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
        <button type="button" className="admin-icon-button" aria-label="Cerrar formulario" onClick={requestClose}><X size={20} aria-hidden="true" /></button>
      </header>
      {confirmClose && <div className="admin-dialog-discard" role="alert"><strong>Tienes cambios sin guardar.</strong><p>Puedes volver al formulario o cerrarlo. Al cerrar, conservaremos los campos mientras permanezcas en esta pantalla.</p><div className="admin-form-actions"><button type="button" className="admin-button admin-button-secondary" onClick={() => setConfirmClose(false)}>Seguir editando</button><button type="button" className="admin-button admin-button-danger" onClick={() => { dirty.current = false; dialog.current?.close(); }}>Cerrar sin guardar</button></div></div>}
      <div className="admin-dialog-body"><DialogClose value={requestClose}>{children}</DialogClose></div>
    </dialog>
  </div>;
}
