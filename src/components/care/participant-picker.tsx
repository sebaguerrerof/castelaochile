"use client";
import { useId, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { CareIdentity } from "@/types/care";
import { useCareErrors } from "./care-form";
export function ParticipantPicker({initial,selectedIds,initialTotal}:{initial:CareIdentity[];selectedIds:string[];initialTotal?:number}) {
  const [items,setItems]=useState(initial);const [selected,setSelected]=useState(initial.filter(p=>selectedIds.includes(p.id)));
  const [q,setQ]=useState("");const [page,setPage]=useState(1);const [total,setTotal]=useState(initialTotal??initial.length);
  const [pending,setPending]=useState(false);const [message,setMessage]=useState("");
  const errors=useCareErrors("patients");const errorId=useId();
  async function search(nextPage=1){setPending(true);setMessage("");try{const {data,error}=await createBrowserSupabaseClient().rpc("care_directory",{q:q.trim().slice(0,100),page:nextPage});if(error||!data)throw new Error();const result=data as {patients:CareIdentity[];total:number};setItems(result.patients);setTotal(result.total);setPage(nextPage);setMessage(`${result.total} coincidencias autorizadas.`);}catch{setMessage("No fue posible buscar. Revisa tu acceso e inténtalo de nuevo.");}finally{setPending(false);}}
  return <fieldset className="care-participant-options" aria-describedby={errors?errorId:undefined} aria-invalid={Boolean(errors)}><legend>Participantes esperados ({selected.length} seleccionados)</legend>
    <label>Buscar dentro de mis pacientes<input type="search" value={q} maxLength={100} onChange={e=>setQ(e.target.value)}/></label><button type="button" className="admin-button admin-button-secondary" disabled={pending} onClick={()=>search()}>Buscar participantes</button>
    {selected.map(p=><input type="hidden" name="patients" value={p.id} key={p.id}/>)}
    {selected.length>0&&<p className="care-subtle">Seleccionados: {selected.map(p=>p.display_name).join(", ")}. Se conservan al buscar o cambiar página.</p>}
    {items.map(p=><label className="care-check" key={p.id}><input type="checkbox" checked={selected.some(s=>s.id===p.id)} onChange={e=>setSelected(current=>e.target.checked?current.length<100?[...current,p]:current:current.filter(s=>s.id!==p.id))}/>{p.display_name}</label>)}
    <div className="care-nav">{page>1&&<button className="admin-button admin-button-secondary" type="button" disabled={pending} onClick={()=>search(page-1)}>Anterior</button>}{page*25<total&&<button className="admin-button admin-button-secondary" type="button" disabled={pending} onClick={()=>search(page+1)}>Siguiente</button>}</div>
    <p role="status">{pending?"Buscando pacientes autorizados…":message}</p>{!items.length&&<p>Sin coincidencias; los seleccionados se conservan.</p>}{errors&&<p id={errorId} role="alert">Selecciona al menos un paciente autorizado (máximo 100).</p>}
  </fieldset>;
}
