import { PatientShell } from "@/components/patient-library/patient-shell";
import { requirePatientPage } from "@/lib/patient-library/server";
import { careEnabled } from "@/lib/care/server";
export default async function ProtectedPatientLayout({children}:{children:React.ReactNode}) {
  const {patient}=await requirePatientPage();
  return <PatientShell name={patient.display_name} careEnabled={careEnabled()}>{children}</PatientShell>;
}
