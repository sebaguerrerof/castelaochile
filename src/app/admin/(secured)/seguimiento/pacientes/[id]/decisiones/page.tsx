import { DecisionFileList } from "@/components/care/decision-pages";
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{pagina?:string;estado?:string}>}){return <DecisionFileList pid={(await params).id} search={await searchParams}/>;}
