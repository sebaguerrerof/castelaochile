import { InformIndex } from "@/components/care/inform-pages";
export default async function Page({searchParams}:{searchParams:Promise<{pagina?:string;q?:string}>}){return <InformIndex search={await searchParams}/>;}
