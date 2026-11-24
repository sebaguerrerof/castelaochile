import { MetricsView } from "@/components/care/metrics-view";
import type { MetricParams } from "@/lib/care/metrics";
export default async function MetricsPage({searchParams}:{searchParams:Promise<MetricParams>}){return <MetricsView params={await searchParams}/>;}
