import "server-only";

import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/types/database";

export type AdminContext = { user: User; role: AdminRole };

export class UnauthenticatedAdminError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "UnauthenticatedAdminError";
  }
}

export class ForbiddenAdminError extends Error {
  constructor() {
    super("An active staff role is required.");
    this.name = "ForbiddenAdminError";
  }
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data: adminUser, error: roleError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (roleError || !adminUser?.is_active) return null;
  return { user: userData.user, role: adminUser.role };
}

export async function requireAdmin(allowedRoles?: readonly AdminRole[]): Promise<AdminContext> {
  const context = await getAdminContext();
  if (!context) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new UnauthenticatedAdminError();
    throw new ForbiddenAdminError();
  }
  if (allowedRoles && !allowedRoles.includes(context.role)) throw new ForbiddenAdminError();
  return context;
}

export const canManageContent = (role: AdminRole) => role === "superadmin" || role === "editor";
export const canManageConsultations = canManageContent;
export const canManageUsers = (role: AdminRole) => role === "superadmin";
