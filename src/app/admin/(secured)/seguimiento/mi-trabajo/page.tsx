import { SupervisionPage } from "@/components/care/supervision-page";
export default async function Page({searchParams}:{searchParams:Promise<{dias?:string;pagina?:string;tipo?:string;profesional?:string;estado?:string;paciente?:string}>}){const search=await searchParams;return <SupervisionPage search={{...search,tipo:search.tipo??"agenda"}}/>;}
