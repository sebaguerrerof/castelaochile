import { AdminPanel } from "@/components/admin/admin-ui";
import { CareField,CareForm } from "./care-form";
import { recoveryMonthlyAction } from "@/app/admin/(secured)/seguimiento/inform-actions";
import { recoveryMonthlyContextSchema,recoveryMonthlyFields } from "@/lib/care/recovery-monthly";
import { recoveryDimensionKeys } from "@/lib/care/recovery-weekly";
import { recoveryRubricCatalog } from "@/lib/care/recovery-coach-server";
import { requireInform } from "@/lib/care/inform-server";
import type { InformRead } from "@/lib/care/informs";
import { careTimestamp } from "@/lib/care/time";
export async function RecoveryMonthly({data}:{data:InformRead}){
 if(data.inform.kind!=="monthly"||data.snapshot.population!==1)return null;
 const {client}=await requireInform(),result=await client.rpc("care_rc_monthly_context",{rid:data.inform.id});if(result.error)throw new Error("No fue posible verificar permisos del resumen mensual.");
 const context=recoveryMonthlyContextSchema.parse(result.data);if(!context.eligible)return null;
 const rubric=(await recoveryRubricCatalog()).find(r=>r.document_version==="1.0")!,v=data.version,current=v.revision===data.inform.revision;
 const hidden=(op:string)=><><input name="id" type="hidden" value={data.inform.id}/><input name="version" type="hidden" value={v.revision}/><input name="op" type="hidden" value={op}/><CareField name="reason" label="Motivo o evidencia de esta acción mensual"><input required minLength={3} maxLength={600}/></CareField></>;
 return <AdminPanel title="Resumen mensual Recovery" description="Texto profesional, entrega y revisión de Dirección son estados distintos. Las fuentes semanales conservan versión y autor; no se inventan conclusiones por ausencia de datos.">
 <p>{v.recovery_delivered_at?`Entregado el ${careTimestamp(v.recovery_delivered_at)}; ${v.recovery_reviewed_at?`Dirección revisó el ${careTimestamp(v.recovery_reviewed_at)}`:"pendiente de revisión de Dirección"}`:"Texto generado o borrador profesional; aún no entregado"}.</p>
 <p>La revisión pendiente se gestiona en Informes, priorizada para su destinatario de Dirección. Confirmar entrega no envía correo ni acredita comunicación externa.</p>
 {v.recovery_text&&<details><summary>Consultar texto profesional de esta versión</summary>{Object.entries(recoveryMonthlyFields).map(([key,label])=><section key={key}><h3>{label}</h3><p>{v.recovery_text![key as keyof typeof recoveryMonthlyFields]||"Sin texto profesional registrado"}</p></section>)}{recoveryDimensionKeys.map(key=><section key={key}><h3>{rubric.dimensions.find(d=>d.key===key)!.label}</h3><p>{v.recovery_text!.changes[key]||"Sin texto por dimensión"}</p></section>)}</details>}
 {v.recovery_review_note&&<p>Revisión de Dirección: {v.recovery_review_note}</p>}
 {context.can_write&&<>
 <details><summary>Editar resumen profesional Recovery</summary><CareForm key="monthly-text" disabled={!current} action={recoveryMonthlyAction} label="Guardar texto mensual sin entregar">
 <p>Escribe hechos breves. Si falta información, déjalo expresamente indicado; las fuentes están en este informe. Editar conserva anteriores y requiere una nueva entrega.</p>
 {Object.entries(recoveryMonthlyFields).map(([key,label])=><CareField key={`${v.revision}-${key}`} name={key} label={label}><textarea maxLength={600} rows={2} defaultValue={v.recovery_text?.[key as keyof typeof recoveryMonthlyFields]??""}/></CareField>)}
 {recoveryDimensionKeys.map(key=><details key={`${v.revision}-${key}`}><summary>{rubric.dimensions.find(d=>d.key===key)!.label}</summary><CareField name={`changes.${key}`} label={`Cambios observados — ${rubric.dimensions.find(d=>d.key===key)!.label}`}><textarea maxLength={600} rows={2} defaultValue={v.recovery_text?.changes[key]??""}/></CareField></details>)}{hidden("recovery_draft")}
 </CareForm></details>
 <details><summary>Confirmar entrega mensual a Dirección</summary><CareForm key="monthly-deliver" disabled={!current||Boolean(v.recovery_delivered_at)} action={recoveryMonthlyAction} label="Entregar esta versión a Dirección"><p>Antes de entregar, guarda texto completo o constancias de evidencia insuficiente en todas las dimensiones.</p><CareField name="recipient_id" label="Dirección destinataria autorizada"><select required defaultValue=""><option value="">Selecciona destinatario</option>{context.recipients?.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></CareField><CareField name="confirm" label="Confirmo entregar realmente esta versión dentro de la plataforma"><input type="checkbox" required/></CareField>{hidden("recovery_deliver")}</CareForm></details>
 </>}
 {context.can_review&&<details><summary>Revisar entrega Recovery como Dirección</summary><CareForm key="monthly-review" disabled={!current||!v.recovery_delivered_at||Boolean(v.recovery_reviewed_at)} action={recoveryMonthlyAction} label="Registrar revisión mensual de Dirección"><CareField name="confirm" label="Confirmo revisión humana del texto, cobertura y fuentes de esta entrega"><input type="checkbox" required/></CareField>{hidden("recovery_review")}</CareForm></details>}
 </AdminPanel>;
}
