import { PasswordChangeForm } from "@/components/admin/password-change-form";
import { requirePatientPage } from "@/lib/patient-library/server";
export default async function PatientProfilePage() {
  const {patient,user}=await requirePatientPage();
  return <><p className="library-eyebrow">Tu cuenta</p><h1>Mi perfil</h1><section className="library-panel"><h2>{patient.display_name}</h2><p>{user.email}</p><p>Si necesitas corregir tus datos, contacta al equipo del Instituto.</p></section><section className="library-panel patient-password"><h2>Cambiar contraseña</h2><PasswordChangeForm email={user.email ?? ""}/></section></>;
}
