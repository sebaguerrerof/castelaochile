import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { careEnabled } from "./server";
import { getPatientContext } from "@/lib/patient-library/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reportDay } from "./reports";
import type { ReportEditorData,ReportSlot } from "@/types/care";
type Client=Awaited<ReturnType<typeof createServerSupabaseClient>>;
export async function reportsForDay(client:Client,pid:string,value?:string) {
  const day=reportDay(value);const prepared=await client.rpc("care_reports_prepare",{pid,report_day:day});
  if(prepared.error)throw new Error("No fue posible comprobar las obligaciones de reporte.");
  const data=prepared.data as {day:string;timezone:string;slots:ReportSlot[]};
  const ids=data.slots.flatMap(s=>s.obligation_id?[s.obligation_id]:[]);
  const [reports,obligations,revisions,reviews]=ids.length?await Promise.all([
    client.from("care_daily_reports").select("*").in("id",ids),client.from("care_report_obligations").select("*").in("id",ids),
    client.from("care_report_revisions").select("*").in("report_id",ids).order("version",{ascending:false}),
    client.from("care_report_reviews").select("*").in("report_id",ids).order("reviewed_at",{ascending:false}),
  ]):[{data:[],error:null},{data:[],error:null},{data:[],error:null},{data:[],error:null}];
  if(reports.error||obligations.error||revisions.error||reviews.error)throw new Error("No fue posible cargar los reportes autorizados.");
  return {...data,reports:reports.data,obligations:obligations.data,revisions:revisions.data,reviews:reviews.data};
}
export async function patientReports(value?:string) {
  if(!careEnabled())notFound();const context=await getPatientContext();
  return {...context,data:await reportsForDay(context.client,context.patient.id,value)};
}
export async function patientReportEditor(id:string) {
  if(!careEnabled()||!z.uuid().safeParse(id).success)notFound();const context=await getPatientContext();
  const {data,error}=await context.client.rpc("care_report_editor",{oid:id});
  if(error||!data)notFound();return {...context,editor:data as unknown as ReportEditorData};
}
