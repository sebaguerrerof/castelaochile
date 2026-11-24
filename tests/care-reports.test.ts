import assert from "node:assert/strict";
import test from "node:test";
import { reportDay,reportConfigSchemas,validateReportAnswers } from "../src/lib/care/reports.ts";
test("Report day follows Santiago civil day and never selects a future or malformed day",()=>{
  const now=new Date("2026-10-10T01:00:00Z");assert.equal(reportDay(undefined,now),"2026-10-09");
  assert.equal(reportDay("2026-10-10",now),"2026-10-09");assert.equal(reportDay("2026-02-30",now),"2026-10-09");assert.equal(reportDay("2026-09-01",now),"2026-09-01");
});
test("Configured required answers constrain send but never prevent saving incomplete private draft",()=>{
  const o={fields:["state","planning"] as const,required_fields:["state"] as const};
  const config={fields:[...o.fields],required_fields:[...o.required_fields]};
  assert.equal(validateReportAnswers(config,{state:"",planning:""},false).state,"");
  assert.throws(()=>validateReportAnswers(config,{state:"",planning:""},true));
  assert.deepEqual(validateReportAnswers(config,{state:"  Relato propio  ",planning:""},true),{state:"Relato propio",planning:""});
  assert.throws(()=>validateReportAnswers(config,{state:"QA",planning:"",diagnostic_score:99},false));
  assert.throws(()=>validateReportAnswers(config,{state:"x".repeat(601),planning:""},false));
});
test("Rule approval, type fields and overnight window require deliberate configuration",()=>{
  const valid={kind:"morning",effective_on:"2026-10-09",opens_local:"08:00",closes_local:"11:00",close_next_day:false,basis:"active_days",weekdays:[1,2,3],fields:["state"],required_fields:["state"],confirm_approved:true,reason:"Configuración de fixture"};
  assert.equal(reportConfigSchemas.rule.safeParse(valid).success,true);
  for(const change of [{confirm_approved:false},{closes_local:"07:00"},{fields:["activities"]},{required_fields:["planning"]},{weekdays:[]}])assert.equal(reportConfigSchemas.rule.safeParse({...valid,...change}).success,false);
  assert.equal(reportConfigSchemas.rule.safeParse({...valid,opens_local:"21:00",closes_local:"01:00",close_next_day:true}).success,true);
});
