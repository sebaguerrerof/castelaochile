import { SupervisionPage } from "@/components/care/supervision-page";
import { requireDirection } from "@/lib/care/decision-server";
export default async function Page({searchParams}:{searchParams:Promise<{dias?:string;pagina?:string;tipo?:string;profesional?:string;estado?:string;paciente?:string}>}){await requireDirection();return <SupervisionPage search={await searchParams} team/>;}
