import { LibraryBrowser } from "@/components/patient-library/library-browser";
export default async function PatientFolder({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {return <LibraryBrowser values={await searchParams} folderId={(await params).id}/>;}
