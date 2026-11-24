import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export class LibraryUploadError extends Error {
  constructor(message:string,public attachmentId?:string,public version?:number){super(message);}
}
async function status(id:string) {
  const response=await fetch(`/api/pacientes/adjuntos/${id}`,{cache:"no-store",credentials:"same-origin"});
  if(!response.ok) throw new Error("No pudimos confirmar la carga. Revisa el borrador antes de reintentar.");
  return await response.json() as {state:string;version:number};
}
export async function discardIncompleteUpload(id:string) {
  const current=await status(id);
  if(current.state==="ready") return current.version;
  if(["pending","failed"].includes(current.state)) {
    const response=await fetch(`/api/pacientes/adjuntos/${id}`,{method:"DELETE",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:current.version})});
    if(!response.ok) throw new LibraryUploadError("No pudimos retirar el intento anterior. Revisa el borrador.",id,current.version);
    return (await response.json()).version as number;
  }
  return current.version;
}
export async function uploadLibraryFile(file:File,materialId:string,version:number,previousAttempt?:string,reusePrevious=true) {
  let id=previousAttempt,replaces="";
  try {
    if(id) {
      let current=await status(id);
      if(current.state==="pending") {
        await fetch(`/api/pacientes/adjuntos/${id}/finalizar`,{method:"POST",credentials:"same-origin",cache:"no-store"});
        current=await status(id);
      }
      if(current.state==="ready") {
        if(reusePrevious) return {id,version:current.version};
        replaces=id;version=current.version;
      }
      if(["pending","failed"].includes(current.state)) {
        const retired=await fetch(`/api/pacientes/adjuntos/${id}`,{method:"DELETE",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:current.version})});
        if(!retired.ok) throw new Error("No pudimos resolver el intento anterior. Revisa el borrador.");
        version=(await retired.json()).version;
      }
      id=undefined;
    }
    const begun=await fetch("/api/pacientes/adjuntos",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({material_id:materialId,version,replaces_id:replaces,name:file.name,size:file.size})});
    const result=await begun.json(); if(!begun.ok) throw new Error(result.error ?? "No pudimos autorizar el archivo.");
    id=result.id;
    const {error}=await createBrowserSupabaseClient().storage.from("patient-library").uploadToSignedUrl(result.path,result.token,file,{contentType:result.mime,cacheControl:"0"});
    if(error) throw new Error("La transferencia no terminó. Conservamos el borrador; puedes reintentar.");
    const finished=await fetch(`/api/pacientes/adjuntos/${id}/finalizar`,{method:"POST",credentials:"same-origin",cache:"no-store"});
    if(!finished.ok) throw new Error((await finished.json()).error ?? "No pudimos validar el archivo.");
    const current=await status(id!); if(current.state!=="ready") throw new Error("No pudimos confirmar el archivo.");
    return {id:id!,version:current.version};
  } catch(error) {
    if(id) {
      try { const current=await status(id); version=current.version; if(current.state==="ready") return {id,version}; } catch { /* Keep the unknown attempt for reconciliation, never assume success. */ }
    }
    throw new LibraryUploadError(error instanceof Error ? error.message : "No pudimos subir el archivo.",id,version);
  }
}
