import assert from "node:assert/strict";
import test from "node:test";
import { sendPatientAccessEmail } from "../src/lib/patient-library/invitations.ts";

function delivery(existing=false) {
  const calls:string[]=[];
  return {calls,options:{
    enabled:true,
    claim:async()=>{calls.push("claim");return {email:"patient@example.test",existing};},
    invite:async(email:string)=>{calls.push(`invite:${email}`);return {error:null};},
    recover:async(email:string)=>{calls.push(`recover:${email}`);return {error:null};},
    complete:async(success:boolean)=>{calls.push(`complete:${success}`);},
  }};
}

test("disabled patient email gate performs no claim or provider operation",async()=>{
  const {calls,options}=delivery();
  await assert.rejects(sendPatientAccessEmail({...options,enabled:false}),/desactivado/);
  assert.deepEqual(calls,[]);
});

test("new patient invitation uses only the database recipient and records success",async()=>{
  const {calls,options}=delivery();
  assert.equal(await sendPatientAccessEmail(options),"invitation");
  assert.deepEqual(calls,["claim","invite:patient@example.test","complete:true"]);
});

test("existing Auth account receives recovery without another invitation",async()=>{
  const {calls,options}=delivery(true);
  assert.equal(await sendPatientAccessEmail(options),"recovery");
  assert.deepEqual(calls,["claim","recover:patient@example.test","complete:true"]);
});

test("provider rejection records failure and does not expose provider details",async()=>{
  const {calls,options}=delivery();
  await assert.rejects(sendPatientAccessEmail({...options,invite:async()=>({error:new Error("secret-provider-detail")})}),error=>{
    assert.match((error as Error).message,/reintentarlo/);
    assert.doesNotMatch((error as Error).message,/secret-provider-detail/);
    return true;
  });
  assert.deepEqual(calls,["claim","complete:false"]);
});

test("transport exceptions also leave a retryable failed invitation result",async()=>{
  const {calls,options}=delivery();
  await assert.rejects(sendPatientAccessEmail({...options,invite:async()=>{throw new Error("transport");}}),/reintentarlo/);
  assert.deepEqual(calls,["claim","complete:false"]);
});

test("invalid or denied database claim never calls the email provider",async()=>{
  const {calls,options}=delivery();
  await assert.rejects(sendPatientAccessEmail({...options,claim:async()=>({existing:false})}),/preparar/);
  await assert.rejects(sendPatientAccessEmail({...options,claim:async()=>{throw new Error("denied");}}),/denied/);
  assert.deepEqual(calls,[]);
});

test("delivery accepted but audit failure requests provider review before retry",async()=>{
  const {calls,options}=delivery();
  await assert.rejects(sendPatientAccessEmail({...options,complete:async()=>{throw new Error("db-detail");}}),/envío se solicitó.*Revisa el proveedor/);
  assert.deepEqual(calls,["claim","invite:patient@example.test"]);
});
