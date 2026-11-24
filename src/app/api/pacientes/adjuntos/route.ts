import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkLibraryRate, checkMutationOrigin, requireLibraryStaff } from "@/lib/patient-library/server";
import { attachmentLimit, declaredAttachment } from "@/lib/patient-library/files";
import { readLibraryJson } from "@/lib/patient-library/http";
import { privateHeaders, uuid } from "@/lib/patient-library/policy";
import type { LibraryAttachment } from "@/types/patient-library";

export const dynamic="force-dynamic";
export async function POST(request: Request) {
  let attachment: LibraryAttachment | null=null;
  let actor: string | null=null;
  try {
    await checkMutationOrigin();
    const {client,admin}=await requireLibraryStaff("content"); actor=admin.user.id;
    await checkLibraryRate(`upload:${actor}`);
    const input=z.object({material_id:uuid,version:z.number().int().positive(),replaces_id:z.union([uuid,z.literal("")]),name:z.string().min(1).max(255),size:z.number().int().positive()}).strict().parse(await readLibraryJson(request));
    const {material_id,version,replaces_id}=input;
    const info=declaredAttachment(input.name,input.size,attachmentLimit());
    const {data,error}=await client.rpc("library_manage",{op:"attachment_begin",p:{...info,material_id,version,replaces_id}});
    if(error || !data) throw new Error("No fue posible autorizar la carga. Recarga y comprueba el límite de cinco adjuntos.");
    attachment=data as unknown as LibraryAttachment;
    const service=createAdminSupabaseClient();
    const {data:signed,error:signError}=await service.storage.from("patient-library").createSignedUploadUrl(attachment.object_key,{upsert:false});
    if(signError || !signed) throw new Error("No fue posible autorizar la transferencia. Retira el intento y reintenta.");
    // This is write-only authorization for a random pending key, never a download URL.
    return Response.json({id:attachment.id,path:attachment.object_key,token:signed.token,mime:info.mime},{headers:privateHeaders});
  } catch(error) {
    if(attachment && actor) {
      try {await createAdminSupabaseClient().rpc("library_finish_attachment",{aid:attachment.id,ready:false,actor});} catch { /* Pending records block publication; no public object is exposed. */ }
    }
    const message=error instanceof Error && !(error instanceof z.ZodError) ? error.message : "No fue posible autorizar. Revisa el formato, tamaño y estado del material.";
    return Response.json({error:message},{status:400,headers:privateHeaders});
  }
}
