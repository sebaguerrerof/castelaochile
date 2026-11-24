import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { forbidden } from "next/navigation";
import { PatientCreateForm } from "@/components/admin/patient-create-form";
import { AdminPanel, PageHeader, StatePanel } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getLibraryPermissions, portalEnabled } from "@/lib/patient-library/server";
import { hasLibraryCapability } from "@/lib/patient-library/policy";
import { createLibraryPatient } from "../../library-actions";

export default async function NewPatientPage() {
  await requireAdmin();
  if (!portalEnabled()) return <StatePanel tone="disabled" title="Portal pendiente de activación" description="Activa el portal antes de crear pacientes." />;
  if (!hasLibraryCapability(await getLibraryPermissions(), "access")) forbidden();
  return <><PageHeader title="Nuevo paciente" description="Agrega sus datos y decide si quieres enviarle el acceso ahora." actions={<Link prefetch={false} className="admin-button admin-button-secondary" href="/admin/pacientes"><ArrowLeft aria-hidden="true" size={17} />Volver a pacientes</Link>} />
    <div className="patient-admin-create-layout"><AdminPanel title="Datos del paciente"><PatientCreateForm action={createLibraryPatient} emailsEnabled={process.env.PATIENT_AUTH_EMAILS_ENABLED === "true"} /></AdminPanel><aside className="patient-admin-guide"><h2>Así entra al portal</h2><ol><li><strong>Agregas su nombre y correo.</strong><span>Puedes enviar el acceso ahora o más adelante.</span></li><li><strong>Recibe un enlace personal.</strong><span>El paciente elige su propia contraseña.</span></li><li><strong>Entra a su biblioteca.</strong><span>Solo verá materiales publicados para todos, para sus grupos o para él.</span></li></ol><p>Crear un paciente no publica ni comparte informes individuales.</p></aside></div>
  </>;
}
