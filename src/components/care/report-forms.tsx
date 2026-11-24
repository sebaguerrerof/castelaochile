import { CareErrors,CareField,CareForm,type CareFormState } from "./care-form";
import { reportDay,reportFields,reportFieldLabels,reportKindLabels } from "@/lib/care/reports";
import type { CareTables,ReportKind } from "@/types/care";
type Action=(_:CareFormState,form:FormData)=>Promise<CareFormState>;
const H=({name,value}:{name:string;value:string|number})=><input type="hidden" name={name} value={value}/>;
function WindowFields(){return <><div className="care-grid"><CareField name="opens_local" label="Apertura (hora de Chile)"><input required type="time"/></CareField><CareField name="closes_local" label="Plazo de envío (hora de Chile)"><input required type="time"/></CareField></div><label className="care-check"><input type="checkbox" name="close_next_day"/>El plazo corresponde al día siguiente.</label></>;}
export function RuleForm({kind,action}:{kind:ReportKind;action:Action}) {
  return <CareForm action={action} label={`Guardar regla de ${reportKindLabels[kind].toLowerCase()}`}><H name="op" value="rule"/><H name="kind" value={kind}/>
    <CareField name="effective_on" label="Aplicar desde el día"><input type="date" required min={reportDay()} defaultValue={reportDay()}/></CareField><WindowFields/>
    <CareField name="basis" label="Días elegibles"><select required defaultValue=""><option value="" disabled>Selecciona la regla aprobada</option><option value="active_days">Días de episodio activo</option><option value="agenda_days">Días activos con agenda institucional esperada</option></select></CareField>
    <fieldset className="care-options" aria-describedby={`${kind}-weekdays-errors`}><legend>Días de la semana</legend>{["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map((l,i)=><label className="care-check" key={l}><input type="checkbox" name="weekdays" value={i+1}/>{l}</label>)}<CareErrors name="weekdays" id={`${kind}-weekdays-errors`}/></fieldset>
    <fieldset className="care-options" aria-describedby={`${kind}-fields-errors`}><legend>Campos aprobados y requeridos al enviar</legend>{reportFields[kind].map(f=><div key={f}><label className="care-check"><input type="checkbox" name="fields" value={f}/>{reportFieldLabels[f]}</label><label className="care-check"><input type="checkbox" name="required_fields" value={f}/>Requerido: {reportFieldLabels[f]}</label></div>)}<CareErrors name="fields" id={`${kind}-fields-errors`}/></fieldset>
    <CareField name="reason" label="Motivo de la configuración"><input required minLength={3} maxLength={300}/></CareField><label className="care-check"><input type="checkbox" name="confirm_approved" required/>Confirmo que dirección aprobó estos campos, horarios y días.</label>
    <p className="care-subtle">Nueva versión: conserva las obligaciones ya generadas y los plazos históricos. No crea omisiones anteriores a la incorporación.</p>
  </CareForm>;
}
export function EnrolForm({pid,enrol,action}:{pid:string;enrol:CareTables["care_report_enrolments"]["Row"]|null;action:Action}) {
  return <CareForm action={action} label={enrol?"Guardar periodo de reportes":"Incorporar a reportes"}><H name="op" value="enrol"/><H name="patient_id" value={pid}/><H name="version" value={enrol?.version??0}/>
    {enrol?<><p>Incorporación original: {enrol.starts_on}</p><H name="starts_on" value={enrol.starts_on}/></>:<CareField name="starts_on" label="Incorporación a reportes"><input type="date" required min={reportDay()} defaultValue={reportDay()}/></CareField>}
    <CareField name="ends_on" label="Último día incluido (opcional)"><input type="date" min={reportDay()} defaultValue={enrol?.ends_on??""}/></CareField><CareField name="reason" label="Motivo del periodo de reportes"><input required minLength={3} maxLength={300}/></CareField>
  </CareForm>;
}
export function ReportExceptionForm({pid,action,window=false}:{pid:string;action:Action;window?:boolean}) {
  return <CareForm action={action} label={window?"Guardar ventana excepcional":"Registrar exención"}><H name="op" value={window?"window":"exempt"}/><H name="patient_id" value={pid}/>
    <CareField name="kind" label="Reporte al que aplica"><select required defaultValue=""><option value="" disabled>Selecciona reporte</option><option value="morning">Mañana</option><option value="evening">Noche</option>{!window&&<option value="both">Ambos</option>}</select></CareField>
    <div className="care-grid"><CareField name="starts_on" label="Desde el día"><input type="date" required min={reportDay()} defaultValue={reportDay()}/></CareField><CareField name="ends_on" label="Hasta el día inclusive"><input type="date" required min={reportDay()} defaultValue={reportDay()}/></CareField></div>
    {window&&<WindowFields/>}<CareField name="reason" label="Motivo interno de la excepción"><input required minLength={3} maxLength={300}/></CareField>
    <p className="care-subtle">{window?"Aplica a obligaciones aún no generadas. Conserva plazos existentes.":"Exime pendientes aún abiertos y nuevas obligaciones. No cambia envíos ni periodos cerrados."}</p>
  </CareForm>;
}
