import { patientReports } from "@/lib/care/report-server";
import { reportDay } from "@/lib/care/reports";
import { ReportStatus,ReportReadingNotice } from "@/components/care/report-status";
export default async function PatientReportsPage({searchParams}:{searchParams:Promise<{dia?:string}>}) {
  const {dia}=await searchParams;const {data}=await patientReports(dia);
  return <div className="care-patient-workspace"><p className="library-eyebrow">Mi autorreporte</p><h1>Reportes diarios</h1><p className="library-lead">Cuenta cómo te encuentras y cómo organizaste tu día. Un borrador no cuenta como enviado; el primer envío conserva su hora aunque lo corrijas después.</p>
    <ReportReadingNotice/>
    <form method="get" className="care-search"><label>Día de Chile<input type="date" name="dia" max={reportDay()} defaultValue={data.day}/></label><button className="admin-button">Ver día</button></form>
    <div className="care-grid">{data.slots.map(s=><ReportStatus slot={s} key={s.kind} patientMode/>)}</div><p className="care-subtle">Si no se generó tu reporte a tiempo, se muestra como datos incompletos, sin atribuirte incumplimiento.</p>
  </div>;
}
