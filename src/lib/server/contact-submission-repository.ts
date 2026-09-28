import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ContactSubmission } from "@/lib/contact-form-schema";

export async function persistContactSubmission(submission: ContactSubmission, sourcePath: string, idempotencyKey: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("contact_submissions").upsert({
    name: submission.name,
    email: submission.email,
    phone: submission.phone || null,
    message: submission.message || null,
    source_path: sourcePath,
    idempotency_key: idempotencyKey,
  }, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (error) throw new Error("Could not persist contact submission.");
}
