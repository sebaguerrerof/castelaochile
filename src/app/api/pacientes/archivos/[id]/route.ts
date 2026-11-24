import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getPatientContext, requireLibraryStaff } from "@/lib/patient-library/server";
import { contentDisposition, maximumAttachmentBytes } from "@/lib/patient-library/files";
import { privateHeaders, uuid } from "@/lib/patient-library/policy";
import { documentPreview } from "@/lib/patient-library/document-preview";

export const dynamic="force-dynamic";
const unavailable=()=>new Response("Recurso no disponible.",{status:404,headers:privateHeaders});
export async function GET(request: Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params; if(!uuid.safeParse(id).success) return unavailable();
    const url=new URL(request.url);
    const isStaff=url.searchParams.get("staff")==="1";
    const {client}=isStaff ? await requireLibraryStaff("read") : await getPatientContext();
    const {data:attachment,error}=await client.from("patient_library_attachments").select("id,material_id,object_key,original_name,mime,bytes,state").eq("id",id).eq("state","ready").maybeSingle();
    if(error || !attachment || attachment.bytes>maximumAttachmentBytes) return unavailable();
    if(!isStaff) {
      const {data:detail,error:detailError}=await client.rpc("library_patient_material",{mid:attachment.material_id});
      if(detailError || !detail) return unavailable();
    }
    if(url.searchParams.has("paciente")) {
      if(!isStaff || !uuid.safeParse(url.searchParams.get("paciente")).success) return unavailable();
      const {data:preview,error:previewError}=await client.rpc("library_preview",{mid:attachment.material_id,pid:url.searchParams.get("paciente")!});
      if(previewError || !preview) return unavailable();
    }
    // The client supplies only an attachment UUID; the authorized DB row determines bucket/key.
    const {data:blob,error:downloadError}=await createAdminSupabaseClient().storage.from("patient-library").download(attachment.object_key);
    if(downloadError || !blob || blob.size!==attachment.bytes) return unavailable();
    const readDocument=url.searchParams.get("lectura")==="1";
    const preview=readDocument ? await documentPreview(new Uint8Array(await blob.arrayBuffer()),attachment.original_name) : null;
    // A bounded buffer is used instead of Range. Check live RLS again before sending bytes.
    const {data:stillAllowed}=await client.from("patient_library_attachments").select("id").eq("id",id).eq("state","ready").maybeSingle();
    if(!stillAllowed) return unavailable();
    if(isStaff) await requireLibraryStaff("read");
    const {data:finalCheck}=await client.rpc(isStaff && url.searchParams.has("paciente") ? "library_preview" : "library_patient_material",
      isStaff && url.searchParams.has("paciente") ? {mid:attachment.material_id,pid:url.searchParams.get("paciente")!} : {mid:attachment.material_id});
    if((!isStaff || url.searchParams.has("paciente")) && !finalCheck) return unavailable();
    if(preview) return Response.json(preview,{headers:{...privateHeaders,"Cross-Origin-Resource-Policy":"same-origin"}});
    const inline=url.searchParams.get("vista")==="1" && (attachment.mime==="application/pdf" || attachment.mime.startsWith("image/"));
    return new Response(blob.stream(),{headers:{...privateHeaders,"Content-Type":attachment.mime,"Content-Length":String(blob.size),
      "Content-Disposition":contentDisposition(attachment.original_name,inline),"Accept-Ranges":"none",
      "Content-Security-Policy":"default-src 'none'; sandbox","Cross-Origin-Resource-Policy":"same-origin"}});
  } catch {return unavailable();}
}
