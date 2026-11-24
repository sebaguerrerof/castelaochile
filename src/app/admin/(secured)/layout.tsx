import { forbidden, redirect } from "next/navigation";

import { AdminRuntimeUnavailable } from "@/components/admin/admin-runtime-unavailable";
import { AdminShell } from "@/components/admin/admin-shell";
import { ForbiddenAdminError, UnauthenticatedAdminError, requireAdmin, type AdminContext } from "@/lib/auth/admin";
import { RuntimeConfigurationError } from "@/lib/runtime-config";
import { getLibraryPermissions } from "@/lib/patient-library/server";
import { careEnabled, getCareCapabilities } from "@/lib/care/server";
import { demoBatches } from "@/lib/demo/server";
import { AdminNotice } from "@/components/admin/admin-ui";
import Link from "next/link";

import "./admin.css";
import "@/app/(public)/public-content.css";
import "@/app/(public)/public-design.css";
import "@/components/patient-library/admin-library.css";
import "@/components/care/care.css";
import "./admin-design.css";
import "./admin-workspace.css";

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
  const [libraryPermissions,careCapabilities]=await Promise.all([getLibraryPermissions(),getCareCapabilities()]);
  const demoActive=admin.role==="superadmin"&&(await demoBatches()).some(batch=>batch.state==="active"||batch.state==="removing");
  return <AdminShell email={admin.user.email ?? "Cuenta sin correo"} role={admin.role} libraryPermissions={libraryPermissions} careCapabilities={careCapabilities} careEnabled={careEnabled()}>{demoActive&&<AdminNotice tone="info">Datos DEMO activos · Los módulos incluyen ejemplos ficticios para la presentación. <Link href="/admin/demostracion" prefetch={false}>Ver recorrido o retirar ejemplos</Link></AdminNotice>}{children}</AdminShell>;
}
