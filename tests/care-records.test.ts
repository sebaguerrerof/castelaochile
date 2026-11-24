import assert from "node:assert/strict";
import test from "node:test";
import { commonRecordFields,specialtyRecordFields,validateClinicalPayload,recordWriteSchema,recordPayloadFields } from "../src/lib/care/records.ts";
test("Clinical draft is incomplete; finalization requires objective and deliberate categorical evolution",()=>{
 const p=Object.fromEntries([...commonRecordFields,...specialtyRecordFields.psychology].map(f=>[f,""]));
 assert.equal(validateClinicalPayload("psychology",p,false).evolution,"");assert.throws(()=>validateClinicalPayload("psychology",p,true));
 const final={...p,objective:"  Objetivo neutral QA  ",evolution:"not_evaluable"};assert.equal(validateClinicalPayload("psychology",final,true).objective,"Objetivo neutral QA");
 for(const evolution of ["", "green", "75", 75])assert.throws(()=>validateClinicalPayload("psychology",{...final,evolution},true));
});
test("Specialty contract rejects medical and numeric rubric injection in other forms",()=>{
 const recovery=Object.fromEntries(recordPayloadFields("recovery").map(f=>[f,""]));
 assert.equal(validateClinicalPayload("recovery",{...recovery,autonomy:"Observación cualitativa"},false).autonomy,"Observación cualitativa");
 assert.throws(()=>validateClinicalPayload("recovery",{...recovery,medical_indications:"Forjada"},false));
 assert.throws(()=>validateClinicalPayload("recovery",{...recovery,autonomy:4},false));
 assert.throws(()=>validateClinicalPayload("recovery",{...recovery,facts:"x".repeat(601)},false));
 const psych=Object.fromEntries([...commonRecordFields,...specialtyRecordFields.psychiatry].map(f=>[f,""]));
 const v=validateClinicalPayload("psychiatry",{...psych,adherence_reported:"Referido",adherence_observed:"Sin evidencia"},false);assert.notEqual(v.adherence_reported,v.adherence_observed);
});
test("Clinical mutations carry exact identity/version/key and explicit publication/finalization values",()=>{
 assert.equal(recordWriteSchema.safeParse({}).success,false);
 const id="b4000000-0000-4000-8000-000000000001";const p={id,patient_id:id,event_id:id,specialty:"psychology",version:0,operation_key:id,occurred_at:"2026-10-09T12:00:00Z",reserved_note:"",summary_body:"",summary_visibility:"none",request_intervention:false,request_body:"",request_due_at:"",reason:"",confirm_finalize:false,confirm_publish:false};
 assert.equal(recordWriteSchema.safeParse(p).success,true);assert.equal(recordWriteSchema.safeParse({...p,version:-1}).success,false);assert.equal(recordWriteSchema.safeParse({...p,specialty:"direction"}).success,false);
});
