import Link from "next/link";
import { reportKindLabels,reportQualityLabels,reportStateLabels } from "@/lib/care/reports";
import { careTimestamp } from "@/lib/care/time";
import type { ReportSlot } from "@/types/care";
export function ReportReadingNotice(){return <p className="care-subtle">Enviar un reporte no garantiza lectura inmediata. Este espacio no es un canal de urgencias.</p>;}
export function ReportStatus({slot,patientMode=false}:{slot:ReportSlot;patientMode?:boolean}){return <article className="care-card"><div><h3>{reportKindLabels[slot.kind]}</h3><p><strong>{reportStateLabels[slot.state]}</strong></p><p>{reportQualityLabels[slot.quality]??"Revisa la configuración."}</p>{slot.opens_at&&slot.closes_at&&<p className="care-subtle">Apertura {careTimestamp(slot.opens_at)} · plazo {careTimestamp(slot.closes_at)}</p>}{patientMode&&slot.obligation_id&&slot.state!=="not_required"&&<Link href={`/pacientes/reportes/${slot.obligation_id}`} prefetch={false}>{["on_time","late"].includes(slot.state)?"Ver o corregir reporte":"Completar reporte"} →</Link>}</div></article>;}
