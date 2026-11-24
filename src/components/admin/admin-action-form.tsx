"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { AdminActionState, AdminFormAction } from "@/lib/admin-action-state";
import { AdminFormDialog } from "./admin-form-dialog";

const initialState: AdminActionState = { status: "idle" };

const fieldLabels: Record<string, string> = {
  active: "Estado",
  body: "Contenido",
  coverAlt: "Texto alternativo",
  coverImagePath: "Portada",
  categoryIds: "Categorías",
  contentHtml: "Contenido",
  authorName: "Autor",
  publishedAt: "Fecha de publicación",
  seoTitle: "Título SEO",
  seoDescription: "Meta descripción",
  email: "Correo electrónico",
  name: "Nombre",
  description: "Descripción",
  area_id: "Área",
  parent_id: "Carpeta padre",
  display_name: "Nombre del paciente",
  id: "Identificador",
  kind: "Tipo",
  role: "Rol",
  slug: "Slug",
  status: "Estado",
  summary: "Resumen",
  title: "Título",
  userId: "Usuario",
};

export function AdminActionForm({
  action,
  children,
  className,
  confirmMessage,
  warnOnUnsavedChanges = false,
  dialog,
}: {
  action: AdminFormAction;
  children: React.ReactNode;
  className: string;
  confirmMessage?: string;
  warnOnUnsavedChanges?: boolean;
  dialog?: { title: string; triggerLabel: string };
}) {
  const allowReset = useRef(false);
  const [state, formAction, pending] = useActionState(async (previous: AdminActionState, data: FormData) => {
    allowReset.current = false;
    const result = await action(previous, data);
    allowReset.current = result.status !== "error";
    return result;
  }, initialState);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!warnOnUnsavedChanges || !dirty) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, warnOnUnsavedChanges]);
  const fieldErrors = Object.entries(state.fieldErrors ?? {}).flatMap(([field, messages]) =>
    messages.map((message) => ({ field: fieldLabels[field] ?? field, message })),
  );

  const form = (
    <form
      action={formAction}
      aria-busy={pending}
      onReset={event => { if (!allowReset.current) event.preventDefault(); }}
      className={className}
      onChange={() => { if (warnOnUnsavedChanges) setDirty(true); }}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
        else setDirty(false);
      }}
    >
      {children}
      {state.status === "error" && (
        <div aria-live="assertive" className="admin-form-error" role="alert">
          <strong>{state.message ?? "No fue posible completar la operación."}</strong>
          {fieldErrors.length > 0 && (
            <ul>
              {fieldErrors.map(({ field, message }, index) => <li key={`${field}-${index}`}><span>{field}:</span> {message}</li>)}
            </ul>
          )}
        </div>
      )}
    </form>
  );
  return dialog ? <AdminFormDialog {...dialog}>{form}</AdminFormDialog> : form;
}
