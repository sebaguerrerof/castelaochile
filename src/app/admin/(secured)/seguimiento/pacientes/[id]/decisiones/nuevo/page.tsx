import { DecisionNew } from "@/components/care/decision-pages";
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{solicitud?:string;registro?:string}>}){return <DecisionNew pid={(await params).id} search={await searchParams}/>;}
