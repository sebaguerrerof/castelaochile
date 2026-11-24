import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { PatientPasswordForm } from "@/components/patient-library/patient-forms";
import { requirePatientPage } from "@/lib/patient-library/server";

export default async function PatientActivationPage() {
  await requirePatientPage();
  return <main className="patient-auth"><section><BrandLogo/><h1>Crea o restablece tu contraseña</h1><p>Usa al menos doce caracteres. Elige una contraseña que no utilices en otros sitios.</p><PatientPasswordForm/><Link href="/pacientes" prefetch={false}>Ir a mi biblioteca</Link></section></main>;
}
