import { careTimestamp } from "@/lib/care/time";
import { specialtyLabels } from "@/lib/care/policy";
import type { RecordSpecialty } from "@/types/care";
export type PatientRecordSummaries={total:number;summaries:{record_id:string;revision:number;body:string;occurred_at:string;specialty:RecordSpecialty}[]};
export function PatientRecordSummariesPanel({data}:{data:PatientRecordSummaries}){return <section className="library-panel"><h2>Resúmenes que el equipo compartió conmigo</h2>{data.summaries.length?data.summaries.map(s=><article key={s.record_id} className="care-card"><div><h3>{specialtyLabels[s.specialty]} · {careTimestamp(s.occurred_at)}</h3><p>{s.body}</p><p className="care-subtle">Resumen compartido expresamente · revisión {s.revision}</p></div></article>):<p>Aún no hay resúmenes profesionales compartidos contigo.</p>}<p className="care-subtle">Estos resúmenes muestran registros revisados por su autor; no constituyen una evaluación automática de recuperación.</p></section>;}
