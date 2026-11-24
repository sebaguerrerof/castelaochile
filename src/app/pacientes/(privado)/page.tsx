import { LibraryBrowser } from "@/components/patient-library/library-browser";
import { redirect } from "next/navigation";
import { careEnabled } from "@/lib/care/server";
export default async function PatientHome({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {if(careEnabled())redirect("/pacientes/hoy");return <LibraryBrowser values={await searchParams} home/>;}
