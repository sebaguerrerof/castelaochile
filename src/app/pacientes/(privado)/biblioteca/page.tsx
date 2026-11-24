import { LibraryBrowser } from "@/components/patient-library/library-browser";
export default async function PatientLibrary({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {return <LibraryBrowser values={await searchParams}/>;}
