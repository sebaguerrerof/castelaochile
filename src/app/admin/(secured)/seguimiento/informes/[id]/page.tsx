import { InformDetail } from "@/components/care/inform-pages";
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{revision?:string;pagina?:string;metrica?:string;categoria?:string}>}){return <InformDetail id={(await params).id} search={await searchParams}/>;}
