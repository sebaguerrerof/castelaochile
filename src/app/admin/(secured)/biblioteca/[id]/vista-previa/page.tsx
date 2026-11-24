import { notFound } from "next/navigation";
import { MaterialDetail } from "@/components/patient-library/material-detail";
import { requireLibraryStaffPage } from "@/lib/patient-library/admin-page";
import { uuid } from "@/lib/patient-library/policy";
import type { PatientMaterialDetail } from "@/types/patient-library";
export default async function PatientPreview({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{paciente?:string}>}) {
  const {client}=await requireLibraryStaffPage("read");const {id}=await params;const {paciente}=await searchParams;if(!uuid.safeParse(id).success || !uuid.safeParse(paciente).success)notFound();
  const {data,error}=await client.rpc("library_preview",{mid:id,pid:paciente!});if(error)throw new Error("No fue posible comprobar la vista.");
  return <section className="library-private-preview"><p><strong>Vista de paciente</strong> · Resolver de publicación y audiencia vigente</p>{data ? <MaterialDetail detail={data as unknown as PatientMaterialDetail} staffPatientId={paciente}/> : <p>Recurso no disponible para este destinatario.</p>}</section>;
}
