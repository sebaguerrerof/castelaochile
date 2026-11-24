import { z } from "zod";
import { requireLibraryStaff, checkMutationOrigin } from "@/lib/patient-library/server";
import { privateHeaders, uuid } from "@/lib/patient-library/policy";
import { readLibraryJson } from "@/lib/patient-library/http";

export const dynamic="force-dynamic";
const unavailable=()=>Response.json({error:"Carga no disponible."},{status:404,headers:privateHeaders});
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {client}=await requireLibraryStaff("content"); const id=uuid.parse((await params).id);
    const {data:attachment}=await client.from("patient_library_attachments").select("state,material_id").eq("id",id).maybeSingle();
    if(!attachment) return unavailable();
    const {data:material}=await client.from("patient_library_materials").select("version").eq("id",attachment.material_id).single();
    if(!material) return unavailable();
    return Response.json({state:attachment.state,version:material.version},{headers:privateHeaders});
  } catch {return unavailable();}
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    await checkMutationOrigin(); const {client}=await requireLibraryStaff("content");
    const id=uuid.parse((await params).id),{version}=z.object({version:z.number().int().positive()}).strict().parse(await readLibraryJson(request));
    const {data:attachment}=await client.from("patient_library_attachments").select("state,material_id").eq("id",id).maybeSingle();
    if(!attachment || !["pending","failed"].includes(attachment.state)) return unavailable();
    const {error}=await client.rpc("library_manage",{op:"attachment_retire",p:{id,version}});
    if(error) return Response.json({error:"La carga cambió. Revisa el borrador antes de reintentar."},{status:409,headers:privateHeaders});
    const {data:material}=await client.from("patient_library_materials").select("version").eq("id",attachment.material_id).single();
    if(!material) return unavailable();
    return Response.json({version:material.version},{headers:privateHeaders});
  } catch {return unavailable();}
}
