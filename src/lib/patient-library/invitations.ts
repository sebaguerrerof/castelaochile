import { z } from "zod";

const claimSchema = z.object({ email: z.email(), existing: z.boolean().optional() });

type EmailResult = { error: unknown | null };
type InvitationDelivery = {
  enabled: boolean;
  claim: () => Promise<unknown>;
  invite: (email: string) => Promise<EmailResult>;
  recover: (email: string) => Promise<EmailResult>;
  complete: (success: boolean) => Promise<void>;
};

// Called only after live server authorization. The recipient comes from the guarded
// database claim, never from the invitation form. Keep provider errors out of the UI.
export async function sendPatientAccessEmail(delivery: InvitationDelivery) {
  if (!delivery.enabled) throw new Error("Envío de correos desactivado en este entorno.");
  const parsed = claimSchema.safeParse(await delivery.claim());
  if (!parsed.success) throw new Error("No fue posible preparar el acceso por correo.");
  const { email, existing } = parsed.data;
  let success = false;
  try {
    const result = await (existing ? delivery.recover(email) : delivery.invite(email));
    success = !result.error;
  } catch {
    // A transport failure must also leave a retryable, audited result.
  }
  try {
    await delivery.complete(success);
  } catch {
    throw new Error(success
      ? "El envío se solicitó, pero no fue posible actualizar su estado. Revisa el proveedor antes de reintentar."
      : "No fue posible enviar el enlace ni actualizar su estado. Revisa el proveedor antes de reintentar.");
  }
  if (!success) throw new Error("No fue posible enviar el enlace. Puedes reintentarlo desde el perfil del paciente.");
  return existing ? "recovery" : "invitation";
}
