"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function AdminSubmitButton({ children, pendingLabel = "Guardando…", variant = "primary" }: { children: React.ReactNode; pendingLabel?: string; variant?: "danger" | "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return <button className={`admin-button admin-button-${variant}`} disabled={pending} type="submit">{pending && <LoaderCircle aria-hidden="true" className="admin-spin" size={16} />}{pending ? pendingLabel : children}</button>;
}
