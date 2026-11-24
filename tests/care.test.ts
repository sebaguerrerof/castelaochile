import assert from "node:assert/strict";
import test from "node:test";
import { careLocalInput, careLocalToUtc, careWeekRange } from "../src/lib/care/time.ts";
import { careSchemas, hasCareCapability, carePage } from "../src/lib/care/policy.ts";
import { isCareLocalQa } from "../src/lib/care/local-qa.ts";
test("Local QA limiter requires the opt-in and both exact isolated endpoints",()=>{
  const local={CARE_LOCAL_QA:"true",NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:54421",NEXT_PUBLIC_SITE_URL:"http://localhost:3450"};
  assert.equal(isCareLocalQa(local),true);
  for(const other of [{...local,CARE_LOCAL_QA:"false"},{...local,NEXT_PUBLIC_SUPABASE_URL:"https://project.supabase.co"},{...local,NEXT_PUBLIC_SITE_URL:"https://castelaochile.cl"}])assert.equal(isCareLocalQa(other),false);
});
test("Clinical capabilities never inherit CMS roles or other therapeutic permissions",()=>{
  assert.equal(hasCareCapability([],"care.patient.read"),false);
  assert.equal(hasCareCapability(["care.assignments.manage"],"care.records.read"),false);
  assert.equal(hasCareCapability(["care.records.create"],"care.medical.create"),false);
  assert.equal(hasCareCapability(["care.patient.read"],"care.patient.read"),true);
  assert.equal(careSchemas.capabilities.safeParse({user_id:"71000000-0000-4000-8000-000000000003",capabilities:["unknown"]}).success,false);
});
test("Santiago civil times resolve correctly across seasons",()=>{
  assert.equal(careLocalToUtc("2026-07-09T10:00"),"2026-07-09T14:00:00.000Z");
  assert.equal(careLocalToUtc("2026-10-09T10:00"),"2026-10-09T13:00:00.000Z");
  assert.equal(careLocalInput("2026-10-09T13:00:00.000Z"),"2026-10-09T10:00");
});
test("Nonexistent and duplicated times at DST changes require a deliberate other civil time",()=>{
  assert.throws(()=>careLocalToUtc("2026-09-06T00:30"),/no existe o se repite/);
  assert.throws(()=>careLocalToUtc("2026-04-04T23:30"),/no existe o se repite/);
  assert.throws(()=>careLocalToUtc("2026-02-30T10:00"));
  assert.throws(()=>careLocalToUtc("not-a-date"));
});
test("Episode edits require a concurrency version and explanatory reason",()=>{
  const valid={id:"74000000-0000-4000-8000-000000000001",version:1,status:"paused",phase_id:"",effective_at:"2026-10-09T13:00:00Z",reason:"Pausa de prueba"};
  assert.equal(careSchemas.episode_change.safeParse(valid).success,true);
  assert.equal(careSchemas.episode_change.safeParse({...valid,version:0}).success,false);
  assert.equal(careSchemas.episode_change.safeParse({...valid,reason:""}).success,false);
  assert.equal(carePage(-1),1);assert.equal(carePage("3"),3);
});
test("Weekly agenda uses civil Monday boundaries across Santiago DST and rejects malformed query dates",()=>{
  const range=careWeekRange("2026-09-06");
  assert.equal(range.monday,"2026-08-31");
  assert.equal(range.start,"2026-08-31T04:00:00.000Z");
  assert.equal(range.end,"2026-09-07T03:00:00.000Z");
  assert.equal((Date.parse(range.end)-Date.parse(range.start))/3600000,167);
  for(const invalid of ["2026-99-99","2026-02-30","bad-date"])
    assert.equal(careWeekRange(invalid,new Date("2026-10-09T13:00:00Z")).monday,"2026-10-05");
});
