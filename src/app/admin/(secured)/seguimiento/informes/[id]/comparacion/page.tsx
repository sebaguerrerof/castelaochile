import { InformComparison } from "@/components/care/job-pages";
export const dynamic="force-dynamic";
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{revision?:string;pagina?:string}>}){return <InformComparison id={(await params).id} search={await searchParams}/>;}
