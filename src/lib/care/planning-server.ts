import "server-only";
import { z } from "zod";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPatientContext } from "@/lib/patient-library/server";
import { careEnabled, requireCare } from "./server";
import { careWeekRange } from "./time";
import type { CareEvent, CareParticipant } from "@/types/care";
type Client=Awaited<ReturnType<typeof createServerSupabaseClient>>;
export async function planningData(client:Client,pid:string,patientMode=false,week?:string,page=1) {
  const range=careWeekRange(week);
  const [agenda,plans,commitments,goals]=await Promise.all([
    client.rpc("care_agenda",{pid,start_at:range.start,end_at:range.end,patient_mode:patientMode,page}),
    client.from("care_personal_plans").select("*",{count:"exact"}).eq("patient_id",pid).gte("planned_for",range.start).lt("planned_for",range.end).order("planned_for").order("id").range((page-1)*25,page*25-1),
    patientMode?client.from("care_commitments").select("*",{count:"exact"}).eq("patient_id",pid).eq("visibility","patient").order("status",{ascending:false}).order("due_at").order("id").range((page-1)*25,page*25-1):client.from("care_commitments").select("*",{count:"exact"}).eq("patient_id",pid).order("status",{ascending:false}).order("due_at").order("id").range((page-1)*25,page*25-1),
    client.from("care_patient_goals").select("*").eq("patient_id",pid).maybeSingle(),
  ]);
  if(agenda.error||plans.error||commitments.error||goals.error)throw new Error("No fue posible cargar la planificación autorizada.");
  const data=agenda.data as {events:CareEvent[];participants:CareParticipant[];total:number};
  return {...data,plans:plans.data,commitments:commitments.data,goals:goals.data,range,page,planTotal:plans.count??0,commitmentTotal:commitments.count??0};
}
export async function patientPlanning(week?:string,page=1) {
  if(!careEnabled())notFound();
  const context=await getPatientContext();
  return {...context,data:await planningData(context.client,context.patient.id,true,week,page)};
}
export async function careEvent(id:string) {
  const {client}=await requireCare("care.patient.read");
  const [event,participants]=await Promise.all([client.from("care_events").select("*").eq("id",id).maybeSingle(),client.from("care_event_participants").select("*").eq("event_id",id)]);
  if(event.error||!event.data||participants.error)notFound();
  const history=await client.from("care_event_history").select("*").eq("event_id",id).order("version",{ascending:false});
  if(history.error)throw new Error("No fue posible cargar el historial de la actividad.");
  const {data:roster,error}=await client.rpc("care_event_roster",{eid:id});if(error)throw new Error("No fue posible verificar los participantes autorizados.");
  const names=z.object({can_edit:z.boolean(),patients:z.array(z.object({id:z.uuid(),display_name:z.string(),is_active:z.boolean()}))}).parse(roster);
  return {client,event:event.data,participants:participants.data,history:history.data,roster:names};
}
