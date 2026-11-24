import Link from "next/link";
import { BookOpen, CalendarDays, FileText, Users } from "lucide-react";
import { AdminNotice, AdminPanel, MetricCard, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminDialogActions } from "@/components/admin/admin-form-dialog";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { demoBatches } from "@/lib/demo/server";
import { removeDemonstration } from "./actions";

export default async function DemonstrationPage({ searchParams }: { searchParams: Promise<{ retirado?: string }> }) {
  const batches = await demoBatches(); const search = await searchParams;
  return <><PageHeader eyebrow="Presentación al cliente" title="Demostración" description="Un recorrido con personas y actividades ficticias, identificadas como DEMO." />
    {search.retirado === "1" && <AdminNotice>Demostración retirada: registros, archivos y cuentas de ejemplo eliminados.</AdminNotice>}
    {!batches.length && <StatePanel title="Sin ejemplos activos" description="La demostración ya fue retirada o aún no se ha cargado." />}
    {batches.map(batch => {
      const patient = batch.patients[0]?.id; const s = batch.summary;
      const modules = [
        ["Pacientes y fichas", "/admin/pacientes?q=DEMO", "Tres perfiles con estados y equipos de atención."],
        ["Seguimiento", "/admin/seguimiento", "Asistencia, autorreportes, alertas y coordinación de muestra."],
        ["Agenda del centro", `/admin/seguimiento/agenda?profesional=${s.coach_id}&dias=30`, "Actividades del coach DEMO agrupadas por día; puedes cambiar a todo el equipo."],
        ["Recovery", "/admin/seguimiento/recovery", "Revisiones cualitativas y semanas sin evidencia; sin puntajes."],
        ["Revisión semanal Recovery", patient ? `/admin/seguimiento/pacientes/${patient}/recovery/semanal?semana=${s.recovery_week}` : "/admin/seguimiento/recovery", "Ocho dimensiones con evidencia enlazada. Instrumento en propuesta, sin niveles ni aprobación."],
        ["Ficha, familia y decisiones", patient ? `/admin/seguimiento/pacientes/${patient}` : "/admin/seguimiento", "Planificación, registros y decisiones ficticias enlazadas."],
        ["Informes", "/admin/seguimiento/informes", "Informes semanal y mensual derivados de las fuentes DEMO."],
        ["Grupos terapéuticos", "/admin/grupos-terapeuticos", "Dos grupos de muestra que contienen solo pacientes DEMO."],
        ["Biblioteca", `/admin/biblioteca?q=DEMO&area=${s.area_id}`, "Tres materiales; incluye un PDF para leer dentro de la aplicación."],
        ["Equipo y usuarios", "/admin/usuarios", "Cinco roles de muestra. Sus cuentas tienen el acceso bloqueado."],
        ["Contenidos", "/admin/contenidos?status=draft", "Dos artículos y una noticia; todos en borrador."],
        ["Páginas", "/admin/paginas", "Una página de muestra sin publicar ni añadir al menú público."],
        ["Equipo del sitio", "/admin/equipo", "Tres perfiles profesionales ficticios, en borrador."],
        ["Consultas", "/admin/consultas", "Tres consultas ficticias en distintos estados, sin comunicaciones."],
        ["Analítica de muestra", `/admin/analitica?demo=${batch.id}`, "Gráfico ficticio separado de la medición real del sitio."],
        ["Configuración", "/admin/configuracion", "Muestra la configuración institucional actual; la carga DEMO la conserva."],
      ];
      return <section key={batch.id} className="admin-demo-batch">
        <AdminNotice tone="info">DEMO · Los ejemplos no tienen valor clínico. Los borradores del sitio permanecen sin publicar. No se envían invitaciones ni correos. {batch.state !== "active" && "La carga o limpieza está pendiente de terminar."}</AdminNotice>
        <div className="admin-metric-grid"><MetricCard icon={Users} label="Pacientes DEMO" value={s.patients ?? 0} /><MetricCard icon={CalendarDays} label="Actividades DEMO" value={s.sessions ?? 0} /><MetricCard icon={BookOpen} label="Materiales" value={s.materials ?? 0} /><MetricCard icon={FileText} label="Borradores del sitio" value={s.drafts ?? 0} /></div>
        <div className="admin-demo-grid">{modules.map(([title, href, description]) => <AdminPanel key={title} title={title} description={description}><Link className="admin-button admin-button-secondary" prefetch={false} href={href}>Abrir módulo</Link></AdminPanel>)}</div>
        <AdminPanel title="Programaciones de muestra" description="La programación DEMO y las reglas operativas están desactivadas. No ejecutan tareas ni afectan los pacientes actuales.">{batch.jobs.map((job,index)=><p key={index}><strong>Informe {job.kind === "weekly" ? "semanal" : "mensual"} DEMO:</strong> {job.enabled ? "Activo" : "Desactivado"} · {job.runs} ejecución de muestra registrada.</p>)}<p>La programación pertenece a Dirección DEMO. Las programaciones personales conservan su propietario y se administran desde el módulo habitual.</p><Link href="/admin/seguimiento/programaciones" className="admin-button admin-button-secondary" prefetch={false}>Mis programaciones</Link></AdminPanel>
        <AdminPanel title="Retirar la demostración" description="Elimina los registros, los archivos y las ocho cuentas nuevas de este conjunto. Las cuentas y los datos anteriores se conservan.">
          <AdminActionForm action={removeDemonstration} className="admin-form" dialog={{ title: "Eliminar datos DEMO", triggerLabel: "Eliminar demostración" }}>
            <input type="hidden" name="id" value={batch.id} /><p>Esta acción retira el recorrido completo. Si hay datos reales vinculados a los ejemplos, la limpieza se detiene para protegerlos.</p>
            <label>Escribe ELIMINAR DEMO<input name="confirmation" required autoComplete="off" pattern="ELIMINAR DEMO" /></label>
            <AdminDialogActions><AdminSubmitButton>Eliminar datos DEMO</AdminSubmitButton></AdminDialogActions>
          </AdminActionForm>
        </AdminPanel>
      </section>;
    })}
  </>;
}
