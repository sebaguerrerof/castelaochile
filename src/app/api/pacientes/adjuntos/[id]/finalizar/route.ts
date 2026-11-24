import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkLibraryRate, checkMutationOrigin, requireLibraryStaff } from "@/lib/patient-library/server";
import { attachmentLimit, validateAttachment } from "@/lib/patient-library/files";
import { privateHeaders, uuid } from "@/lib/patient-library/policy";
export const dynamic="force-dynamic";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}) {
  let aid:string | null=null;let actor:string | null=null;
  try {
    await checkMutationOrigin();const {client,admin}=await requireLibraryStaff("content");actor=admin.user.id;
    await checkLibraryRate(`finish:${actor}`);const {id}=await params;aid=uuid.parse(id);
    const {data:a,error}=await client.from("patient_library_attachments").select("*").eq("id",aid).eq("state","pending").maybeSingle();
    if(error || !a)throw new Error("Carga no disponible. Recarga para comprobar su estado.");
    const service=createAdminSupabaseClient();
    const {data:blob,error:downloadError}=await service.storage.from("patient-library").download(a.object_key);
    if(downloadError || !blob)throw new Error("La transferencia no terminó. Retira el intento pendiente y reintenta.");
    if(blob.size>attachmentLimit() || blob.size!==a.bytes)throw new Error("El tamaño real no coincide con la carga autorizada.");
    const valid=validateAttachment(new Uint8Array(await blob.arrayBuffer()),a.original_name,attachmentLimit());
    if(valid.bytes!==a.bytes || valid.mime!==a.mime)throw new Error("El tamaño o el formato real no coincide con la carga autorizada.");
    await requireLibraryStaff("content");
    const {error:finishError}=await service.rpc("library_finish_attachment",{aid,ready:true,actor});
    if(finishError)throw new Error("No fue posible finalizar. Recarga para comprobar el estado.");
    return Response.json({ok:true},{headers:privateHeaders});
  } catch(error) {
    if(aid && actor)try{await createAdminSupabaseClient().rpc("library_finish_attachment",{aid,ready:false,actor});}catch{ /* Pending remains inaccessible. */ }
    return Response.json({error:error instanceof Error ? error.message : "No fue posible verificar la carga."},{status:400,headers:privateHeaders});
  }
}
