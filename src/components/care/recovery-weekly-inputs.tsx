"use client";
import { useState } from "react";
import { CareField } from "./care-form";
import { emptyWeeklyPayload,recoveryDimensionKeys,type RecoveryRubric,type WeeklyPayload } from "@/lib/care/recovery-weekly";
export type WeeklySources={records:{id:string;label:string}[];commitments:{id:string;label:string;review_at:string;pending:boolean}[]};
export function RecoveryWeeklyInputs({initial,rubric,levelsAllowed,sources}:{initial?:WeeklyPayload;rubric:RecoveryRubric;levelsAllowed:boolean;sources:WeeklySources}){
  const [payload,setPayload]=useState(initial??emptyWeeklyPayload());
  const change=(i:number,key:string,value:unknown)=>setPayload(previous=>({dimensions:previous.dimensions.map((d,index)=>index===i?{...d,[key]:value}:d)}));
  return <>{recoveryDimensionKeys.map(key=>rubric.dimensions.find(d=>d.key===key)!).map((dimension,i)=>{const d=payload.dimensions.find(row=>row.key===dimension.key)!;const prefix=`dimensions.${i}.`;
    const text=(key:"evidence"|"support"|"result"|"difficulties"|"se_reason",label:string)=><CareField name={prefix+key} label={label}><textarea rows={2} maxLength={600} value={d[key]} onChange={e=>change(i,key,e.target.value)}/></CareField>;
    const source=(key:"record_ids"|"commitment_ids",label:string,options:{id:string;label:string}[])=><><CareField name={prefix+key} label={label}><select value={d[key][0]??""} onChange={e=>change(i,key,e.target.value?[e.target.value,...d[key].slice(1)]:d[key].slice(1))}><option value="">Sin fuente seleccionada</option>{options.map(row=><option key={row.id} value={row.id}>{row.label}</option>)}{d[key][0]&&!options.some(row=>row.id===d[key][0])&&<option value={d[key][0]}>Fuente anterior: comprueba vigencia antes de finalizar</option>}</select></CareField>{d[key].slice(1).map(id=><input key={id} name={prefix+key} type="hidden" value={id}/>)}</>;
    return <details key={dimension.key} className="care-weekly-dimension"><summary>{dimension.label} · {d.status==="SE"?"Sin evaluar":d.status==="evaluated"?dimension.levels.find(l=>l.key===d.level)?.label??"Nivel pendiente":d.status==="qualitative"?"Cualitativa":"Sin selección"}</summary>
      <p>{dimension.description}</p>
      <CareField name={prefix+"status"} label={`Categoría — ${dimension.label}`}><select value={d.status} onChange={e=>{change(i,"status",e.target.value);if(e.target.value!=="evaluated"){change(i,"level",null);change(i,"evidence_sufficient",false);}}}><option value="">Selecciona al finalizar</option><option value="qualitative">Evaluación cualitativa sin nivel</option><option value="SE">SE — Sin evaluar</option>{levelsAllowed&&<option value="evaluated">Nivel manual con evidencia suficiente</option>}</select></CareField>
      {levelsAllowed&&<CareField name={prefix+"level"} label={`Nivel manual — ${dimension.label}`}><select disabled={d.status!=="evaluated"} value={d.level??""} onChange={e=>change(i,"level",e.target.value||null)}><option value="">Selecciona nivel</option>{dimension.levels.filter(l=>l.key!=="SE").map(l=><option key={l.key} value={l.key}>{l.label}</option>)}</select></CareField>}
      {d.status==="evaluated"&&<><p>{dimension.levels.find(l=>l.key===d.level)?.description??"Selecciona manualmente según evidencia; el apoyo de una actividad no precalifica."}</p><CareField name={prefix+"evidence_sufficient"} label={`Declaro evidencia suficiente — ${dimension.label}`}><input type="checkbox" checked={d.evidence_sufficient} onChange={e=>change(i,"evidence_sufficient",e.target.checked)}/></CareField></>}
      {d.status==="SE"?text("se_reason",`Motivo SE — ${dimension.label}`):<>
        {text("result",`Resultado — ${dimension.label}`)}{text("evidence",`Evidencia y fuente — ${dimension.label}`)}
        {source("record_ids",`Registro de actividad — ${dimension.label}`,sources.records)}
        {source("commitment_ids",`Compromiso revisado — ${dimension.label}`,sources.commitments)}
        {text("support",`Apoyo observado — ${dimension.label}`)}{text("difficulties",`Dificultades — ${dimension.label}`)}
        <CareField name={prefix+"next_commitment_id"} label={`Siguiente compromiso — ${dimension.label}`}><select value={d.next_commitment_id??""} onChange={e=>change(i,"next_commitment_id",e.target.value||null)}><option value="">Selecciona compromiso y su próxima revisión</option>{sources.commitments.filter(c=>c.pending).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></CareField>
        <p className="care-subtle">{sources.commitments.find(c=>c.id===d.next_commitment_id)?.review_at??"El compromiso debe tener fecha de revisión y método; créalo desde el registro de actividad si hace falta."}</p>
      </>}
      <input type="hidden" name={prefix+"key"} value={dimension.key}/>
    </details>;
  })}</>;
}
