"use client";

import { useActionState, useEffect, useState } from "react";

import type { AdminActionState, AdminFormAction } from "@/lib/admin-action-state";

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
  email: "Correo institucional",
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
}: {
  action: AdminFormAction;
  children: React.ReactNode;
  className: string;
  confirmMessage?: string;
  warnOnUnsavedChanges?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
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

  return (
    <form
      action={formAction}
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
}
