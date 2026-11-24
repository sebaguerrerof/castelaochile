import { LibraryBrowser } from "@/components/patient-library/library-browser";
export default async function PatientFavorites({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {return <LibraryBrowser values={await searchParams} favorites/>;}
