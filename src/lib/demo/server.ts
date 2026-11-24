import "server-only";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { forbidden } from "next/navigation";
export type DemoBatch = { id: string; label: string; state: string; created_at: string; summary: Record<string, string | number>; patients: { id: string; name: string }[]; jobs: {kind: string; enabled: boolean; runs: number}[]; analytics: { date: string; value: number; visitors: number }[] };
export async function demoBatches(): Promise<DemoBatch[]> {
  if ((await requireAdmin()).role !== "superadmin") forbidden();
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("demo_status");
  if (error) throw new Error("No fue posible consultar la demostración.");
  return data as unknown as DemoBatch[];
}
