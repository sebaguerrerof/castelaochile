"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function AdminSubmitButton({ children, pendingLabel = "Guardando…", variant = "primary", name, value, disabled = false }: { children: React.ReactNode; pendingLabel?: string; variant?: "danger" | "primary" | "secondary"; name?: string; value?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`admin-button admin-button-${variant}`} disabled={pending || disabled} name={name} type="submit" value={value}>{pending && <LoaderCircle aria-hidden="true" className="admin-spin" size={16} />}{pending ? pendingLabel : children}</button>;
}
