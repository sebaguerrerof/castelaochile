import Link from "next/link";
import { AdminPanel, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { CareField, CareForm } from "@/components/care/care-form";
import { carePatient, careResponsibles, getCareCapabilities } from "@/lib/care/server";
import { careLocalInput, careTimestamp } from "@/lib/care/time";
import { careStatusLabels, specialtyLabels } from "@/lib/care/policy";
import { manageCare } from "../../actions";
import { PatientFileNav } from "@/components/care/patient-file-nav";
import { staffPlanningAction } from "../../planning-actions";
import type { RecordDetail } from "@/types/care";
import { evolutionLabels } from "@/lib/care/records";

export default async function CarePatientPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const {client,patient}=await carePatient(id);const caps=await getCareCapabilities();
  const [episodes,phases,assignments]=await Promise.all([
    client.from("care_episodes").select("*").eq("patient_id",id).order("started_at",{ascending:false}),
    client.from("care_phases").select("*").order("label"),careResponsibles(id),
  ]);
  if(episodes.error||phases.error)throw new Error("No fue posible cargar la ficha de atención.");
  const episode=episodes.data.find(e=>!e.ended_at);const manager=caps.includes("care.assignments.manage");
  const latestRecord=caps.includes("care.records.read")||caps.includes("care.records.create")?await client.from("care_session_records").select("*").eq("patient_id",id).eq("status","final").order("occurred_at",{ascending:false}).order("id").limit(1).maybeSingle():{data:null,error:null};
  if(latestRecord.error)throw new Error("No fue posible comprobar el último registro autorizado.");
  const latestBody=latestRecord.data?await client.rpc("care_record_read",{rid:latestRecord.data.id}):{data:null,error:null};if(latestBody.error)throw new Error("No fue posible leer la evolución autorizada.");
  const evolution=latestBody.data?(latestBody.data as unknown as RecordDetail).versions[0]?.payload.evolution:undefined;
  const goals=await client.from("care_patient_goals").select("*").eq("patient_id",id).maybeSingle();
  if(goals.error)throw new Error("No fue posible cargar los objetivos compartidos.");
  const history=episodes.data.length?await client.from("care_episode_history").select("*").in("episode_id",episodes.data.map(e=>e.id)).order("effective_at",{ascending:false}):{data:[],error:null};
  if(history.error)throw new Error("No fue posible cargar el historial.");
  return <><PageHeader eyebrow="Ficha de atención" title={patient.display_name} description="Estado del tratamiento y trayectoria. La coordinación compartida y las reservas conservan permisos distintos." actions={<Link href="/admin/seguimiento" prefetch={false} className="admin-button admin-button-secondary">Volver a pacientes</Link>}/>
    <PatientFileNav autonomyAllowed={caps.includes("care.records.read")} familyAllowed={caps.includes("care.records.read")&&caps.includes("care.family.read")} followupAllowed={caps.includes("care.records.read")} recordsAllowed={caps.includes("care.records.read")||caps.includes("care.records.create")} id={id} active="summary" decisionsAllowed={caps.includes("care.decisions.manage")&&caps.includes("care.records.read")} reportsAllowed={caps.includes("care.records.read")||caps.includes("care.assignments.manage")}/>
    <div className="care-grid"><AdminPanel title="Resumen"><p><strong>Tratamiento:</strong> {episode?careStatusLabels[episode.status]:"Sin episodio abierto"}</p><p><strong>Acceso al portal:</strong> {patient.is_active?"Habilitado":"Suspendido"}</p><p><strong>Ingreso del episodio:</strong> {episode?careTimestamp(episode.started_at):"Sin datos"}</p><p><strong>Fase:</strong> {phases.data.find(p=>p.id===episode?.phase_id)?.label??"Sin fase configurada"}</p>{latestRecord.data&&evolution?<p><strong>Última evolución registrada:</strong> {evolutionLabels[evolution as keyof typeof evolutionLabels]} · {specialtyLabels[latestRecord.data.specialty]} · {careTimestamp(latestRecord.data.occurred_at)}. <Link href={`/admin/seguimiento/pacientes/${id}/registros/${latestRecord.data.id}`} prefetch={false}>Ver registro del profesional autor</Link></p>:<p className="care-subtle">Sin valoración profesional finalizada visible. No se infiere recuperación a partir de actividad o acceso.</p>}
    {caps.includes("care.records.read")&&<p><Link href="/admin/biblioteca" prefetch={false}>Biblioteca terapéutica</Link> · Su lectura requiere el permiso independiente de biblioteca.</p>}</AdminPanel>
    <AdminPanel title="Responsables"><ul>{assignments.map(a=><li key={a.id}>{specialtyLabels[a.specialty]} · {a.label}</li>)}</ul>{!assignments.length&&<p>Sin responsables vigentes.</p>}</AdminPanel></div>
    <AdminPanel title="Objetivos actuales compartidos" description="Estos objetivos son visibles al paciente. Usa los registros reservados para información interna."><p>{goals.data?.objectives||"Sin objetivos registrados."}</p>{caps.includes("care.records.create")&&<details><summary>Actualizar objetivos</summary><CareForm action={staffPlanningAction} label="Guardar objetivos compartidos"><input name="op" type="hidden" value="goals"/><input name="patient_id" type="hidden" value={id}/><input name="version" type="hidden" value={goals.data?.version??0}/><CareField name="objectives" label="Objetivos acordados con el paciente"><textarea rows={3} maxLength={600} defaultValue={goals.data?.objectives}/></CareField></CareForm></details>}</AdminPanel>
    {manager&&<AdminPanel dialog={episode?"Actualizar tratamiento":"Registrar ingreso"} title={episode?"Actualizar tratamiento":"Registrar ingreso o reincorporación"} description="Fecha efectiva en Chile. El cambio conserva autor, fecha de registro e historia; una reincorporación crea otro episodio."><CareForm action={manageCare} label={episode?"Guardar cambio":"Abrir episodio"}>
      <input type="hidden" name="op" value={episode?"episode_change":"episode"}/>
      {episode?<><input type="hidden" name="id" value={episode.id}/><input type="hidden" name="version" value={episode.version}/><CareField name="status" label="Estado del tratamiento"><select key={episode.version} defaultValue={episode.status}>{Object.entries(careStatusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></CareField></>:<input type="hidden" name="patient_id" value={id}/>}
      <CareField name={episode?"effective_at":"started_at"} label={episode?"Fecha efectiva del cambio":"Fecha de ingreso"}><input type="datetime-local" required defaultValue={careLocalInput()}/></CareField>
      <CareField name="phase_id" label="Fase del programa"><select defaultValue={episode?.phase_id??""}><option value="">Sin fase configurada</option>{phases.data.filter(p=>p.is_active||p.id===episode?.phase_id).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></CareField>
      <CareField name="reason" label="Motivo breve"><input minLength={3} maxLength={300} required/></CareField>
    </CareForm></AdminPanel>}
    <AdminPanel title="Trayectoria de tratamiento" description="Los episodios cerrados conservan sus fechas; los cambios tardíos distinguen fecha efectiva y fecha de registro.">
      {episodes.data.length?<div className="care-cards">{episodes.data.map(e=><article className="care-card" key={e.id}><div><h3>{careStatusLabels[e.status]}</h3><p>Ingreso: {careTimestamp(e.started_at)}</p><p>{e.ended_at?`Cierre: ${careTimestamp(e.ended_at)}`:"Episodio abierto"}</p><ol className="care-history">{history.data?.filter(h=>h.episode_id===e.id).map(h=><li key={h.id}><strong>{careStatusLabels[h.status]} · {careTimestamp(h.effective_at)}</strong><p>{h.reason}</p><p className="care-subtle">Registrado {careTimestamp(h.recorded_at)} · versión {h.version}</p></li>)}</ol></div></article>)}</div>:<StatePanel title="Sin trayectoria registrada" description="El coordinador puede registrar el ingreso al programa. No se reconstruye desde la fecha de creación de la cuenta."/>}
    </AdminPanel>
  </>;
}
