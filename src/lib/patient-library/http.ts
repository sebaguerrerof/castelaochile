/** Consume a bounded JSON body even if Content-Length is missing or forged. */
export async function readLibraryJson(request: Request,max=4096):Promise<unknown> {
  if(Number(request.headers.get("content-length"))>max) throw new Error("Solicitud demasiado grande.");
  const reader=request.body?.getReader();if(!reader)throw new Error("Solicitud vacía.");
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new Error("Solicitud demasiado grande.");}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
