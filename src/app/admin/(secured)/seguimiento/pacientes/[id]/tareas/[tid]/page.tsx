import { TaskDetail } from "@/components/care/decision-pages";
export default async function Page({params}:{params:Promise<{id:string;tid:string}>}){const p=await params;return <TaskDetail pid={p.id} tid={p.tid}/>;}
