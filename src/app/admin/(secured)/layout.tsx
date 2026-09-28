import { forbidden, redirect } from "next/navigation";

import { AdminRuntimeUnavailable } from "@/components/admin/admin-runtime-unavailable";
import { AdminShell } from "@/components/admin/admin-shell";
import { ForbiddenAdminError, UnauthenticatedAdminError, requireAdmin, type AdminContext } from "@/lib/auth/admin";
import { RuntimeConfigurationError } from "@/lib/runtime-config";

import "./admin.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Resolution = { kind: "configured"; admin: AdminContext } | { kind: "unconfigured" } | { kind: "unauthenticated" } | { kind: "forbidden" };

async function resolveAdmin(): Promise<Resolution> {
  try { return { kind: "configured", admin: await requireAdmin() }; }
  catch (error) {
    if (error instanceof RuntimeConfigurationError) return { kind: "unconfigured" };
    if (error instanceof UnauthenticatedAdminError) return { kind: "unauthenticated" };
    if (error instanceof ForbiddenAdminError) return { kind: "forbidden" };
    throw error;
  }
}

export default async function AdminProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const resolution = await resolveAdmin();
  if (resolution.kind === "unconfigured") return <AdminRuntimeUnavailable />;
  if (resolution.kind === "unauthenticated") redirect("/admin/login");
  if (resolution.kind === "forbidden") forbidden();
  const { admin } = resolution;
  return <AdminShell email={admin.user.email ?? "Cuenta sin correo"} role={admin.role}>{children}</AdminShell>;
}
