"use client";

import { useActionState } from "react";

import type { AdminActionState, AdminFormAction } from "@/lib/admin-action-state";

const initialState: AdminActionState = { status: "idle" };

const fieldLabels: Record<string, string> = {
  active: "Estado",
  body: "Contenido",
  coverAlt: "Texto alternativo",
  coverImagePath: "Portada",
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
}: {
  action: AdminFormAction;
  children: React.ReactNode;
  className: string;
  confirmMessage?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const fieldErrors = Object.entries(state.fieldErrors ?? {}).flatMap(([field, messages]) =>
    messages.map((message) => ({ field: fieldLabels[field] ?? field, message })),
  );

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
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
