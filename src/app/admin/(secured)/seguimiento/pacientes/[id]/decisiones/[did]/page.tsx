import { DecisionDetail } from "@/components/care/decision-pages";
export default async function Page({params}:{params:Promise<{id:string;did:string}>}){const p=await params;return <DecisionDetail pid={p.id} did={p.did}/>;}
