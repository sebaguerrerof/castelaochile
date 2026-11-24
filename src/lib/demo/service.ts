import { randomBytes } from "node:crypto";
import PDFDocument from "pdfkit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.ts";

type Client = SupabaseClient<Database>;
type Account = { id: string; email: string; slot?: string };
type Receipt = { state: string; files: { bucket: string; key: string }[]; accounts: Account[] };
const slots = ["direction", "psychology", "psychiatry", "recovery", "editor", "patient_a", "patient_b", "patient_c"];
const labels = ["Dirección", "Psicóloga", "Psiquiatra", "Coach Recovery", "Editor", "Alba Ríos", "Bruno Torres", "Carla Vidal"];
function checked<T>(response: { data: T; error: null } | { data: unknown; error: { message: string } }): NonNullable<T> {
  if (response.error) throw new Error(response.error.message);
  return response.data as NonNullable<T>;
}
async function pdf() {
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: "DEMO · Guía del recorrido", Author: "Castelao Chile · Demostración", CreationDate: new Date("2026-10-12T00:00:00Z"), ModDate: new Date("2026-10-12T00:00:00Z") } });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => { doc.on("data", chunk => chunks.push(chunk)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  doc.fillColor("#007bb8").fontSize(24).text("DEMO · Guía del recorrido");
  doc.moveDown().fillColor("#173a50").fontSize(13).text("Material ficticio para presentar Biblioteca. Sin datos de personas reales y sin valor terapéutico.");
  doc.moveDown().text("1. Busca un recurso en Biblioteca.\n\n2. Abre el archivo dentro de la aplicación.\n\n3. Revisa los destinatarios y el estado de lectura.\n\n4. Dirección puede retirar todos los ejemplos desde Demostración.");
  doc.end(); return done;
}
/** Dedicated server/CLI operation: creates new, blocked identities and only batch-owned rows. */
export async function seedDemo(service: Client, actor: string) {
  const bid = checked(await service.rpc("demo_begin", { actor }));
  const state = checked(await service.rpc("demo_service_state", { bid })) as unknown as { state: string; accounts: Account[] };
  if (state.state === "active") return { id: bid, summary: checked(await service.rpc("demo_seed", { bid })) };
  for (const [index, slot] of slots.entries()) {
    if (state.accounts.some(a => a.slot === slot)) continue;
    const email = `demo-${bid}-${slot}@example.invalid`;
    // Recover a create/register interruption only when both the exact email and immutable app marker match.
    let existing: Account | undefined;
    for (let page = 1; ; page++) {
      const listed = checked(await service.auth.admin.listUsers({ page, perPage: 1000 }));
      const candidate = listed.users.find(u => u.email === email && u.app_metadata.castelao_demo_batch === bid);
      if (candidate) { existing = { id: candidate.id, email }; break; }
      if (listed.users.length < 1000) break;
    }
    const user = existing ?? checked(await service.auth.admin.createUser({ email, password: randomBytes(48).toString("base64url"), email_confirm: true, ban_duration: "876000h", app_metadata: { castelao_demo_batch: bid }, user_metadata: { full_name: `DEMO · ${labels[index]}`, display_name: `DEMO · ${labels[index]}` } })).user;
    if (!user) throw new Error("No fue posible crear la identidad DEMO.");
    try { checked(await service.rpc("demo_register_account", { bid, slot_name: slot, uid: user.id })); }
    catch (error) { if (!existing) await service.auth.admin.deleteUser(user.id); throw error; }
  }
  const summary = checked(await service.rpc("demo_seed", { bid })) as unknown as Record<string, string | number>;
  const bytes = await pdf();
  const attachment = checked(await service.rpc("demo_file", { bid, mid: String(summary.material_id), file_bytes: bytes.length })) as unknown as { id: string; object_key: string; state: string };
  const accounts = checked(await service.rpc("demo_service_state", { bid })) as unknown as { accounts: Account[] };
  if (attachment.state !== "ready") {
    const bucket = service.storage.from("patient-library");
    const uploaded = await bucket.upload(attachment.object_key, bytes, { contentType: "application/pdf", upsert: false });
    if (uploaded.error) {
      const download = checked(await bucket.download(attachment.object_key));
      if (!Buffer.from(await download.arrayBuffer()).equals(bytes)) throw new Error("El PDF DEMO existente requiere revisión.");
    }
    const persisted = checked(await bucket.download(attachment.object_key));
    if (!(await persisted.text()).startsWith("%PDF-")) throw new Error("No fue posible verificar el PDF DEMO.");
    checked(await service.rpc("library_finish_attachment", { aid: attachment.id, ready: true, actor: accounts.accounts.find(a => a.slot === "direction")!.id }));
  }
  checked(await service.rpc("demo_activate", { bid }));
  return { id: bid, summary };
}

/** Database guards execute first. Receipts can be resumed after an Auth/Storage interruption. */
export async function removeDemo(client: Client, service: Client, bid: string) {
  const receipt = checked(await client.rpc("demo_remove_data", { bid })) as unknown as Receipt;
  if (receipt.state === "removed") return;
  // Validate the entire receipt before any external deletion.
  for (const file of receipt.files) {
    if (!["patient-library", "care-informs"].includes(file.bucket) || !file.key || file.key.includes("..")) throw new Error("Archivo de demostración fuera de alcance.");
  }
  for (const account of receipt.accounts) {
    const result = await service.auth.admin.getUserById(account.id);
    if (result.error && result.error.status !== 404) throw new Error("No pudimos comprobar las identidades DEMO.");
    const user = result.data.user;
    if (user && (user.app_metadata.castelao_demo_batch !== bid || user.email !== account.email || !user.email?.endsWith("@example.invalid"))) throw new Error("Identidad fuera de la demostración; eliminación detenida.");
  }
  for (const bucket of ["patient-library", "care-informs"]) {
    const keys = receipt.files.filter(f => f.bucket === bucket).map(f => f.key);
    if (keys.length) checked(await service.storage.from(bucket).remove(keys));
  }
  for (const account of receipt.accounts) {
    const result = await service.auth.admin.deleteUser(account.id);
    if (result.error && result.error.status !== 404) throw new Error("Los registros fueron retirados; vuelve a intentar para terminar la limpieza de cuentas DEMO.");
  }
  checked(await client.rpc("demo_finish_removal", { bid }));
}
