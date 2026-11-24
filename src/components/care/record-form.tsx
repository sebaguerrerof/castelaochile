import { randomUUID } from "node:crypto";
import { CareForm } from "./care-form";
import { RecordInputs,type RecordInputInitial } from "./record-inputs";
import { staffRecordAction } from "@/app/admin/(secured)/seguimiento/record-actions";
import type { RecordSpecialty,RecordDetail } from "@/types/care";
export function ProfessionalRecordForm({pid,eid,kind,occurredAt,detail,medical,hasRequest=false}:{pid:string;eid:string;kind:RecordSpecialty;occurredAt:string;detail?:RecordDetail;medical:boolean;hasRequest?:boolean}){
 const r=detail?.record;const version=detail?.versions[0];const initial:RecordInputInitial=detail?.draft??{payload:version?.payload??{},reserved_note:version?.reserved_note??"",summary_body:version?.summary?.body??"",summary_visibility:version?.summary?.visibility??"none",request_intervention:false,request_body:"",request_due_at:null};
 return <CareForm action={staffRecordAction} label="Guardar borrador privado" submitVariant="secondary"><input type="hidden" name="op" value="draft"/><input type="hidden" name="id" value={r?.id??randomUUID()}/><input type="hidden" name="patient_id" value={pid}/><input type="hidden" name="event_id" value={eid}/><input type="hidden" name="specialty" value={kind}/><input type="hidden" name="version" value={r?.version??0}/><input type="hidden" name="operation_key" value={randomUUID()}/>{kind==="recovery"&&<input type="hidden" name="recovery_commitment_id" value={initial.payload.recovery_commitment_id??randomUUID()}/>}<RecordInputs key={`${r?.id??eid}-${r?.version??0}`} kind={kind} occurredAt={r?.occurred_at??occurredAt} initial={initial} amend={r?.status==="final"} medical={medical} hasRequest={hasRequest}/></CareForm>;
}
