"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
export function LibraryUploadForm({materialId,version,replacesId}:{materialId:string;version:number;replacesId?:string}) {
  const [message,setMessage]=useState("");const [pending,setPending]=useState(false);const router=useRouter();
  async function upload(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget;setPending(true);setMessage("");
    try {const data=new FormData(form);const file=data.get("file");if(!(file instanceof File))throw new Error("Selecciona un archivo.");
      const response=await fetch("/api/pacientes/adjuntos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({material_id:materialId,version,replaces_id:replacesId ?? "",name:file.name,size:file.size}),credentials:"same-origin",cache:"no-store"});
      const result=await response.json();if(!response.ok) throw new Error(result.error ?? "La carga falló.");
      const {error}=await createBrowserSupabaseClient().storage.from("patient-library").uploadToSignedUrl(result.path,result.token,file,{contentType:result.mime,cacheControl:"0"});
      if(error)throw new Error("La transferencia falló. Recarga, retira el intento pendiente y vuelve a cargar.");
      const finished=await fetch(`/api/pacientes/adjuntos/${result.id}/finalizar`,{method:"POST",credentials:"same-origin",cache:"no-store"});
      if(!finished.ok){const failed=await finished.json();throw new Error(failed.error ?? "La verificación falló.");}
      setMessage("Archivo validado y listo. Recarga el editor antes de continuar.");form.reset();router.refresh();
    } catch(error){setMessage(error instanceof Error ? error.message : "No fue posible subir. Reintenta.");router.refresh();}finally{setPending(false);}
  }
  return <form onSubmit={upload} className="library-upload">{replacesId && <input name="replaces_id" type="hidden" value={replacesId}/>}<label>{replacesId ? "Reemplazar con un archivo nuevo" : "Archivo privado"} (hasta 20 MB)<input accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp" name="file" type="file" required/></label><button className="admin-button admin-button-secondary" disabled={pending}>{pending ? "Validando y cargando…" : replacesId ? "Validar y reemplazar" : "Cargar adjunto"}</button>{message && <p role="status">{message}</p>}</form>;
}
