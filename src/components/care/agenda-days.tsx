import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import { StatePanel } from "@/components/admin/admin-ui";
import type { Supervision } from "@/lib/care/decisions";
import { careLocalInput, careTimezone } from "@/lib/care/time";

export function AgendaDays({ rows }: { rows: Supervision["rows"] }) {
  if (!rows.length) return <StatePanel icon={CalendarDays} title="Sin actividades en este filtro" description="Prueba otro profesional, estado o periodo para revisar la agenda del centro." />;
  const days = new Map<string, Supervision["rows"]>();
  for (const row of [...rows].sort((a,b)=>a.occurred_at.localeCompare(b.occurred_at)||a.source_id.localeCompare(b.source_id))) {
    const day = careLocalInput(row.occurred_at).slice(0,10); days.set(day, [...(days.get(day) ?? []), row]);
  }
  const date = new Intl.DateTimeFormat("es-CL", { timeZone: careTimezone, weekday: "long", day: "numeric", month: "long" });
  const time = new Intl.DateTimeFormat("es-CL", { timeZone: careTimezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const states: Record<string,string> = { scheduled: "Programada", completed: "Realizada", cancelled: "Cancelada" };
  return <div className="care-agenda-days">{[...days].map(([day, events])=><section className="care-agenda-day" key={day} aria-label={date.format(new Date(events[0].occurred_at))}>
    <header><CalendarDays size={18} aria-hidden="true"/><h2>{date.format(new Date(events[0].occurred_at))}</h2><span>{events.length} {events.length===1?"participación":"participaciones"}</span></header>
    <div className="care-agenda-cards">{events.map(row=><article className="care-agenda-card" key={`${row.source_id}-${row.patient_id}`} data-state={row.state}>
      <p className="care-agenda-hour"><Clock3 size={16} aria-hidden="true"/><time dateTime={row.occurred_at}>{time.format(new Date(row.occurred_at))}</time>{row.due_at&&<>–<time dateTime={row.due_at}>{time.format(new Date(row.due_at))}</time></>}</p>
      <span className="admin-status" data-status={row.state}>{states[row.state]??row.state}</span><h3>{row.label}</h3><p>{row.display_name}</p><p className="care-subtle">{row.professional_label}</p>
      <Link href={`/admin/seguimiento/agenda/${row.source_id}`} prefetch={false} className="admin-button admin-button-secondary">Abrir actividad</Link>
    </article>)}</div>
  </section>)}</div>;
}
