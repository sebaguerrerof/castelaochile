import { JobIndex } from "@/components/care/job-pages";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{pagina?:string;q?:string;vista?:string;tipo?:string;estado?:string;regla?:string}>}){return <JobIndex search={await searchParams}/>;}
