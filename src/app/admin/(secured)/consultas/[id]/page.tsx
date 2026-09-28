import { notFound } from "next/navigation";

import { addConsultationNote, updateConsultationStatus } from "@/app/admin/(secured)/actions";
import { requireAdmin } from "@/lib/auth/admin";
import { getConsultation } from "@/lib/repositories/admin-repository";

export default async function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(["superadmin", "editor"]);
  const { id } = await params;
  const { submission, notes } = await getConsultation(id);
  if (!submission) notFound();
  return <>
    <header className="admin-page-header"><div><p className="eyebrow">Consulta protegida</p><h1>{submission.name}</h1><p>Recibida el {new Intl.DateTimeFormat("es-CL", { dateStyle: "full", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(submission.submitted_at))}.</p></div></header>
    <section className="admin-grid"><article className="admin-panel"><h2>Datos de contacto</h2><p><strong>Correo:</strong> {submission.email}</p>{submission.phone && <p><strong>Teléfono:</strong> {submission.phone}</p>}<p><strong>Origen:</strong> {submission.source_path}</p><p><strong>Mensaje:</strong></p><p>{submission.message || "Sin mensaje adicional."}</p></article>
    <form action={updateConsultationStatus} className="admin-panel admin-form"><input name="id" type="hidden" value={submission.id} /><label>Estado<select defaultValue={submission.status} name="status"><option value="new">Nueva</option><option value="in_progress">En curso</option><option value="closed">Cerrada</option><option value="spam">Spam</option></select></label><button type="submit">Actualizar estado</button></form></section>
    <section className="admin-panel"><h2>Notas internas</h2>{notes.length ? notes.map((note) => <article key={note.id}><p>{note.body}</p><small>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(note.created_at))}</small></article>) : <p>No hay notas internas.</p>}<form action={addConsultationNote} className="admin-form"><input name="id" type="hidden" value={submission.id} /><label>Nueva nota<textarea maxLength={2000} name="body" required /></label><button type="submit">Guardar nota</button></form></section>
  </>;
}
