import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePatientPage } from "@/lib/patient-library/server";
import { uuid } from "@/lib/patient-library/policy";
import { MaterialDetail } from "@/components/patient-library/material-detail";
import { FavoriteButton } from "@/components/patient-library/patient-forms";
import { OpenMarker } from "@/components/patient-library/open-marker";
import type { PatientMaterialDetail } from "@/types/patient-library";
export default async function PatientMaterial({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const {client,patient}=await requirePatientPage();if(!uuid.safeParse(id).success)notFound();
  const {data,error}=await client.rpc("library_patient_material",{mid:id});if(error)throw new Error("No fue posible cargar el material.");if(!data)notFound();
  const {data:state}=await client.from("patient_library_user_state").select("favorite,first_opened_at").eq("patient_id",patient.id).eq("material_id",id).maybeSingle();
  return <><Link className="library-text-button" href="/pacientes/biblioteca" prefetch={false}>← Mi biblioteca</Link><MaterialDetail detail={data as unknown as PatientMaterialDetail}/><FavoriteButton id={id} favorite={state?.favorite ?? false}/>{!state?.first_opened_at && <OpenMarker id={id}/>}</>;
}
