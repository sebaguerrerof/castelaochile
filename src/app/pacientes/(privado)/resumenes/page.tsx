import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatientContext } from "@/lib/patient-library/server";
import { careEnabled } from "@/lib/care/server";
import { carePage } from "@/lib/care/policy";
import { PatientRecordSummariesPanel,type PatientRecordSummaries } from "@/components/care/patient-record-summaries";
export default async function SharedSummariesPage({searchParams}:{searchParams:Promise<{pagina?:string}>}){
 if(!careEnabled())notFound();const {client,patient}=await getPatientContext();const page=carePage((await searchParams).pagina);const result=await client.rpc("care_record_shared",{pid:patient.id,page});if(result.error)throw new Error("No fue posible cargar tus resúmenes compartidos.");const data=result.data as PatientRecordSummaries;
 return <div className="care-patient-workspace"><Link href="/pacientes/hoy" prefetch={false}>← Volver a Hoy</Link><h1>Mis resúmenes compartidos</h1><PatientRecordSummariesPanel data={data}/><nav className="care-nav" aria-label="Páginas de resúmenes">{page>1&&<Link href={`?pagina=${page-1}`} prefetch={false}>Anterior</Link>}{data.total>page*25&&<Link href={`?pagina=${page+1}`} prefetch={false}>Siguiente</Link>}</nav></div>;
}
