"use client";
import { useState } from "react";
import { CareField } from "./care-form";
import { reportFieldLabels } from "@/lib/care/reports";
import type { ReportField } from "@/types/care";
/** Controlled text survives React form reset on validation or connection errors. */
export function ReportInputs({fields,requiredFields,initial,correction}:{fields:ReportField[];requiredFields:ReportField[];initial:Partial<Record<ReportField,string>>;correction:boolean}) {
  const [answers,setAnswers]=useState(initial);const [reason,setReason]=useState("");const [confirmed,setConfirmed]=useState(false);
  return <>{fields.map(f=><CareField key={f} name={f} label={`${reportFieldLabels[f]}${requiredFields.includes(f)?" · requerido para enviar":" · opcional"}`}><textarea rows={2} maxLength={600} value={answers[f]??""} onChange={e=>setAnswers(a=>({...a,[f]:e.target.value}))}/></CareField>)}
    {correction?<CareField name="reason" label="Motivo de la corrección"><input maxLength={300} value={reason} onChange={e=>setReason(e.target.value)}/></CareField>:<input type="hidden" name="reason" value=""/>}
    <CareField name="confirm_submit" label="Confirmo enviar este autorreporte al equipo autorizado"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/></CareField>
    <button className="admin-button admin-button-primary" type="submit" name="intent" value="submit">{correction?"Enviar corrección":"Enviar reporte"}</button>
  </>;
}
