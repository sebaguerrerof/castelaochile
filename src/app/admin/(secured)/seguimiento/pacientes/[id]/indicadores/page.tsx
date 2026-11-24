import { MetricsView } from "@/components/care/metrics-view";
import type { MetricParams } from "@/lib/care/metrics";
export default async function PatientMetricsPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<MetricParams>}){return <MetricsView params={await searchParams} patientId={(await params).id}/>;}
