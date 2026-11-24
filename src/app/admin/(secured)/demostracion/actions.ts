"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import type { AdminActionState } from "@/lib/admin-action-state";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { removeDemo } from "@/lib/demo/service";
export async function removeDemonstration(_: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requireAdmin(["superadmin"]);
  const parsed = z.object({ id: z.uuid(), confirmation: z.literal("ELIMINAR DEMO") }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: "Escribe ELIMINAR DEMO para confirmar." };
  try { await removeDemo(await createServerSupabaseClient(), createAdminSupabaseClient(), parsed.data.id); }
  catch { return { status: "error", message: "No se completó la limpieza. Si vinculaste pacientes o datos reales a los ejemplos, retira esos vínculos. Después vuelve a intentar; la operación conserva las cuentas originales." }; }
  revalidatePath("/admin", "layout"); redirect("/admin/demostracion?retirado=1");
}
