"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function OpenMarker({id}:{id:string}) {
  const router=useRouter();
  useEffect(()=>{const controller=new AbortController();void fetch("/api/pacientes/estado",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id}),credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(response=>{if(response.ok && !controller.signal.aborted)router.refresh();}).catch(()=>{});return ()=>controller.abort();},[id,router]);
  return null;
}
