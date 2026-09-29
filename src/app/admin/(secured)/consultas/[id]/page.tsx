import { ArrowLeft, Mail, MessageSquareText, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { addConsultationNote, updateConsultationStatus } from "@/app/admin/(secured)/actions";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { AdminNotice, AdminPanel, PageHeader, StatusBadge } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getConsultation } from "@/lib/repositories/admin-repository";

export default async function ConsultationDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string }> }) {
  await requireAdmin(["superadmin", "editor"]);
  const { id } = await params;
  const { success } = await searchParams;
  const { submission, notes } = await getConsultation(id);
  if (!submission) notFound();
  return <>
    <PageHeader actions={<Link className="admin-button admin-button-secondary" href="/admin/consultas"><ArrowLeft aria-hidden="true" size={17} /> Volver</Link>} description={`Recibida el ${new Intl.DateTimeFormat("es-CL", { dateStyle: "full", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(submission.submitted_at))}.`} eyebrow="Consulta protegida" title={submission.name} />
    {success === "status" && <AdminNotice>El estado de la consulta fue actualizado.</AdminNotice>}
    {success === "note" && <AdminNotice>La nota interna fue guardada.</AdminNotice>}
    <div className="admin-dashboard-grid">
      <div className="admin-stack">
        <AdminPanel title="Mensaje"><p className="admin-message-body">{submission.message || "Sin mensaje adicional."}</p></AdminPanel>
        <AdminPanel title="Datos de contacto"><dl className="admin-definition-list"><div><dt><Mail aria-hidden="true" size={15} /> Correo</dt><dd><a href={`mailto:${submission.email}`}>{submission.email}</a></dd></div>{submission.phone && <div><dt><Phone aria-hidden="true" size={15} /> Teléfono</dt><dd>{submission.phone}</dd></div>}<div><dt>Origen</dt><dd>{submission.source_path}</dd></div><div><dt>Estado actual</dt><dd><StatusBadge value={submission.status} /></dd></div></dl></AdminPanel>
      </div>
      <AdminPanel title="Gestionar estado">
        <AdminActionForm action={updateConsultationStatus} className="admin-form"><input name="id" type="hidden" value={submission.id} /><label htmlFor="consultation-status">Estado<select defaultValue={submission.status} id="consultation-status" name="status"><option value="new">Nueva</option><option value="in_progress">En progreso</option><option value="closed">Cerrada</option><option value="spam">Spam</option></select></label><AdminSubmitButton pendingLabel="Actualizando…">Actualizar estado</AdminSubmitButton></AdminActionForm>
      </AdminPanel>
    </div>
    <AdminPanel className="admin-dashboard-section" title="Notas internas">
      {notes.length ? <div className="admin-note-list">{notes.map((note) => <article key={note.id}><MessageSquareText aria-hidden="true" size={17} /><div><p>{note.body}</p><small>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(note.created_at))}</small></div></article>)}</div> : <p className="admin-form-help">No hay notas internas.</p>}
      <AdminActionForm action={addConsultationNote} className="admin-form admin-note-form"><input name="id" type="hidden" value={submission.id} /><label htmlFor="consultation-note">Nueva nota<textarea id="consultation-note" maxLength={2000} name="body" required /></label><AdminSubmitButton pendingLabel="Guardando nota…">Guardar nota</AdminSubmitButton></AdminActionForm>
    </AdminPanel>
  </>;
}
