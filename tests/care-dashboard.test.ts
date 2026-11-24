import test from "node:test";
import assert from "node:assert/strict";
import { operationalRatio,dashboardDays,sourceHref,assessmentSchema } from "../src/lib/care/dashboard.ts";
test("operational ratios distinguish N=0, observed zero and collective weighted n/N",()=>{
 assert.equal(operationalRatio(0,0),"No aplica · 0/0");assert.equal(operationalRatio(0,4),"0 % · 0/4");assert.equal(operationalRatio(2,5),"40 % · 2/5");assert.equal(operationalRatio(1,3),"33,3 % · 1/3");
});
test("period selectors are bounded and report source uses obligation local day",()=>{
 assert.equal(dashboardDays("7"),7);assert.equal(dashboardDays("90"),90);assert.equal(dashboardDays("999"),30);
 const row={patient_id:"patient",source_id:"session",specialty:"psychology",local_day:"2026-09-06"};
 assert.equal(sourceHref("reports",row),"/admin/seguimiento/pacientes/patient/reportes?dia=2026-09-06");
 assert.equal(sourceHref("records",row,true),"/admin/seguimiento/pacientes/patient/registros/nuevo?actividad=session&tipo=psychology");
 assert.equal(sourceHref("records",row),"/admin/seguimiento/pacientes/patient/registros");
});
test("manual review requires evidence, deliberate color, confirmation and future revision",()=>{
 const id="00000000-0000-4000-8000-000000000001",p={patient_id:id,record_id:id,version:0,color:"red",occurred_at:new Date(Date.now()-60000).toISOString(),review_at:new Date(Date.now()+86400000).toISOString(),reason:"Motivo neutral validado",confirm_approved:true};
 assert.ok(assessmentSchema.safeParse(p).success);for(const bad of [{color:""},{confirm_approved:false},{record_id:""},{review_at:new Date(Date.now()-60000).toISOString()},{occurred_at:new Date(Date.now()+60000).toISOString()}])assert.ok(!assessmentSchema.safeParse({...p,...bad}).success);
});
