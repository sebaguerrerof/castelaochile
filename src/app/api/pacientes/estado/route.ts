import { checkMutationOrigin, getPatientContext } from "@/lib/patient-library/server";
import { privateHeaders, uuid } from "@/lib/patient-library/policy";
import { readLibraryJson } from "@/lib/patient-library/http";
import { revalidatePath } from "next/cache";
export async function POST(request:Request) {
  try {await checkMutationOrigin();const {client}=await getPatientContext();const input=await readLibraryJson(request,200);const mid=uuid.parse((input as {id?:unknown})?.id);const {error}=await client.rpc("library_state",{mid,opened:true});if(error)throw error;revalidatePath("/pacientes","layout");return new Response(null,{status:204,headers:privateHeaders});}
  catch{return Response.json({error:"Material no disponible."},{status:404,headers:privateHeaders});}
}
