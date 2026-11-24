"use client";
import { useState } from "react";
import { CareForm,CareField } from "./care-form";
import { followupAction } from "@/app/admin/(secured)/seguimiento/followup-actions";
export function AlertReviewForm({id,version,state}:{id:string;version:number;state:string}){
 const [selected,setSelected]=useState("receive");const intent=state==="open"?selected:"resolve";
 return <CareForm action={followupAction} label={intent==="receive"?"Registrar recepción":"Registrar resolución"} disabled={state==="resolved"}>
 <input type="hidden" name="id" value={id}/><input type="hidden" name="version" value={version}/>
 <CareField name="intent" label="Acción sobre la alerta"><select value={intent} onChange={e=>setSelected(e.target.value)}>{state==="open"&&<option value="receive">Recibir para seguimiento</option>}<option value="resolve">Resolver con motivo</option></select></CareField>
 <CareField name="reason" label="Motivo de recepción o resolución"><textarea rows={2} minLength={3} maxLength={600} required/></CareField></CareForm>;
}
