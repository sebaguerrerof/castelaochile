import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";

export default async function PatientStaffPermissionsPage() {
  await requireAdmin(["superadmin"]);
  redirect("/admin/usuarios");
}
