import { createHash } from "node:crypto";
import { z } from "zod";
import { requireInform } from "@/lib/care/inform-server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { privateHeaders } from "@/lib/patient-library/policy";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const unavailable=()=>new Response("Recurso no disponible.",{status:404,headers:privateHeaders});
const artifact=z.object({object_key:z.string(),bytes:z.number().int().positive().max(5242880),sha256:z.string().regex(/^[a-f0-9]{64}$/),kind:z.enum(["weekly","monthly"]),start_day:z.string()});
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params,rev=Number(new URL(request.url).searchParams.get("revision"));if(!z.uuid().safeParse(id).success||!Number.isSafeInteger(rev)||rev<1)return unavailable();const {client}=await requireInform();const {data,error}=await client.rpc("care_inform_download",{rid:id,rev});if(error)return unavailable();const pdf=artifact.parse(data);const {data:blob,error:downloadError}=await createAdminSupabaseClient().storage.from("care-informs").download(pdf.object_key);if(downloadError||!blob||blob.size!==pdf.bytes)return unavailable();const bytes=new Uint8Array(await blob.arrayBuffer());if(createHash("sha256").update(bytes).digest("hex")!==pdf.sha256)return unavailable();const {data:stillAllowed,error:revoked}=await client.rpc("care_inform_download",{rid:id,rev});if(revoked||!stillAllowed)return unavailable();return new Response(bytes,{headers:{...privateHeaders,"Content-Type":"application/pdf","Content-Length":String(bytes.byteLength),"Content-Disposition":`attachment; filename="castelao-${pdf.kind}-${pdf.start_day}-r${rev}.pdf"`,"Content-Security-Policy":"default-src 'none'; sandbox","Cross-Origin-Resource-Policy":"same-origin","Accept-Ranges":"none"}});}catch{return unavailable();}}
