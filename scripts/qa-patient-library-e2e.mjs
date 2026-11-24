import assert from "node:assert/strict";
import { createHash,randomBytes,randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir,writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// Never load .env.local here: its keys may target production. Explicit local values are required.
const url=process.env.PATIENT_QA_SUPABASE_URL ?? "http://127.0.0.1:54321";
assert.ok(["localhost","127.0.0.1"].includes(new URL(url).hostname),"Only local Supabase is permitted");
const key=process.env.PATIENT_QA_PUBLISHABLE_KEY,secret=process.env.PATIENT_QA_SECRET_KEY;
if(!key || !secret){console.error("BLOCKED: start Supabase locally and provide PATIENT_QA_PUBLISHABLE_KEY and PATIENT_QA_SECRET_KEY. No remote fallback is allowed.");process.exit(2);}
const captureEmail=process.env.PATIENT_QA_EMAIL_CAPTURE==="true";
const mailpit=process.env.PATIENT_QA_MAILPIT_URL;
if(captureEmail){
  assert.equal(new URL(url).origin,"http://127.0.0.1:54421","Email tests require the dedicated local QA stack");
  assert.equal(mailpit,"http://127.0.0.1:54424","Email tests require the local capture mailbox");
  assert.ok((await fetch(mailpit+"/api/v1/info")).ok,"Local Mailpit must be available before enabling captured email");
}
const require=createRequire(import.meta.url);
const runtime=process.env.CODEX_NODE_MODULES ?? "C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const {chromium}=require(require.resolve("playwright",{paths:[runtime]}));
const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const run=randomUUID().slice(0,8),password=`Aa1!${randomBytes(18).toString("hex")}`;
const fixture={users:[],patients:[],groups:[],materials:[],objects:[]};
const check=result=>{if(result.error)throw new Error(result.error.message);return result.data;};
const checks=[];
let server,browser;
await mkdir("tmp/patient-library-qa",{recursive:true});
await writeFile("tmp/patient-library-qa/pending-auth-cleanup.json",JSON.stringify({run,ids:[]}));
await writeFile("tmp/patient-library-qa/e2e.json",JSON.stringify({status:"RUNNING",emailCapture:captureEmail},null,2));
async function capturedLink(email,type) {
  let html;
  for(let attempt=0;attempt<40;attempt++){
    const response=await fetch(mailpit+"/view/latest.html?query="+encodeURIComponent(`to:${email}`));
    if(response.ok){html=await response.text();break;}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.ok(html,"Expected an email in local Mailpit");
  const links=[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll("&amp;","&"));
  const link=links.find(value=>{try{return new URL(value).pathname==="/auth/confirm";}catch{return false;}});
  assert.ok(link,"Email must use the server confirmation endpoint");
  const target=new URL(link);
  assert.equal(target.origin,"http://localhost:3441");assert.equal(target.searchParams.get("type"),type);
  assert.equal(new URL(target.searchParams.get("next")).pathname,"/pacientes/activar");
  assert.ok(target.searchParams.get("token_hash"));
  return link; // Kept in memory; never persisted in QA reports or logs.
}
async function setPatientPassword(page,nextPassword) {
  await page.getByLabel("Nueva contraseña",{exact:true}).fill(nextPassword);
  await page.getByLabel("Confirmar contraseña",{exact:true}).fill(nextPassword);
  await page.getByRole("button",{name:"Guardar contraseña",exact:true}).click();
  await page.getByRole("link",{name:"Entrar a mi portal",exact:true}).click();
  await page.waitForURL("http://localhost:3441/pacientes");
}
function qaPdf(padding=0) {
  const content="BT /F1 12 Tf 40 740 Td (QA local PDF - contenido neutro) Tj ET";
  const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",`<< /Length ${content.length} >>\nstream\n${content}\nendstream`,"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  if(padding) objects.push(`<< /Length ${padding} >>\nstream\n${" ".repeat(padding)}\nendstream`);
  let document="%PDF-1.7\n";const offsets=[0];
  for(const [index,object] of objects.entries()){offsets.push(Buffer.byteLength(document));document+=`${index+1} 0 obj\n${object}\nendobj\n`;}
  const xref=Buffer.byteLength(document);
  document+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  document+=offsets.slice(1).map(offset=>`${String(offset).padStart(10,"0")} 00000 n \n`).join("");
  document+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(document);
}
try {
  const {data:area,error}=await service.from("therapy_areas").select("id").eq("is_active",true).limit(1).single();if(error)throw new Error("Apply the patient library migration to local Supabase first.");
  const accounts={};
  for(const name of ["a","b","suspended","staff","editor","superadmin"]){
    const email=`portal-qa-${run}-${name}@example.test`;
    const user=check(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name === "superadmin" ? "QA Administradora" : `QA ${name}`}})).user;
    fixture.users.push(user.id);accounts[name]={email,id:user.id};
  }
  check(await service.from("admin_users").insert([{user_id:accounts.staff.id,role:"viewer",is_active:true},{user_id:accounts.editor.id,role:"editor",is_active:true},{user_id:accounts.superadmin.id,role:"superadmin",is_active:true}]));
  check(await service.from("therapeutic_staff_permissions").insert({user_id:accounts.staff.id,manage_access:true,manage_content:true}));
  for(const name of ["a","b","suspended"]){
    const p=check(await service.from("patient_profiles").insert({auth_user_id:accounts[name].id,email:accounts[name].email,display_name:`QA local ${name}`,is_active:name!=="suspended"}).select("id").single());
    fixture.patients.push(p.id);accounts[name].patientId=p.id;
  }
  for(const name of ["a","b"]){const g=check(await service.from("therapy_groups").insert({name:`QA local ${run} ${name}`}).select("id").single());fixture.groups.push(g.id);accounts[name].groupId=g.id;check(await service.from("therapy_group_memberships").insert({group_id:g.id,patient_id:accounts[name].patientId}));}
  const staff=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});check(await staff.auth.signInWithPassword({email:accounts.staff.email,password}));
  const publicAuth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  assert.ok((await publicAuth.auth.signUp({email:`portal-qa-${run}-uninvited@example.test`,password})).error);
  checks.push("Email password login is enabled for invited accounts while public signup is rejected");
  async function material(name,audience,kind="guide",patients=[],groups=[]){const id=randomUUID();check(await staff.rpc("library_manage",{op:"material",p:{id,version:0,title:`QA ${run} ${name}`,description:"Recurso neutro exclusivamente local",area_id:area.id,folder_id:"",kind,body:"<p>Texto de prueba local.</p>",tags:["qa-local"],session_date:"2026-10-08",audience,patients,groups,status:"published",confirm_publish:true}}));fixture.materials.push(id);return id;}
  const general=await material("general","all"),groupA=await material("grupo A","groups","activity",[],[accounts.a.groupId]),groupB=await material("grupo B","groups","exercise",[],[accounts.b.groupId]),report=await material("informe A","patients","report",[accounts.a.patientId]);
  const a=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),b=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  check(await a.auth.signInWithPassword({email:accounts.a.email,password}));check(await b.auth.signInWithPassword({email:accounts.b.email,password}));
  const aIds=check(await a.from("patient_library_materials").select("id").in("id",fixture.materials)).map(m=>m.id);assert.deepEqual(aIds.sort(),[general,groupA,report].sort());checks.push("A normal JWT sees only general, own group and report");
  const bIds=check(await b.from("patient_library_materials").select("id").in("id",fixture.materials)).map(m=>m.id);assert.deepEqual(bIds.sort(),[general,groupB].sort());checks.push("B normal JWT cannot query A report or group");
  assert.equal(check(await b.rpc("library_patient_material",{mid:report})),null);checks.push("PostgREST detail resolver denies B");
  const storage=await b.storage.from("patient-library").list();assert.ok(storage.error || storage.data.length===0);checks.push("Direct Storage listing cannot bypass portal");
  const port=3441,base=`http://localhost:${port}`;
  server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","-p",String(port)],{windowsHide:true,stdio:["ignore","pipe","pipe"],env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key,SUPABASE_SECRET_KEY:secret,NEXT_PUBLIC_SITE_URL:base,NEXT_DIST_DIR:".next-patient-e2e",PATIENT_PORTAL_ENABLED:"true",PATIENT_AUTH_EMAILS_ENABLED:String(captureEmail),ANALYTICS_ENABLED:"false",UPSTASH_REDIS_REST_URL:"",UPSTASH_REDIS_REST_TOKEN:""}});
  // Drain logs without writing therapeutic requests, credentials or tokens to disk.
  server.stdout.on("data",()=>{});server.stderr.on("data",()=>{});
  for(let i=0;i<90;i++){try{if((await fetch(base+"/pacientes/login")).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));if(i===89)throw new Error("Local preview did not start");}
  browser=await chromium.launch({headless:true,executablePath:process.env.PATIENT_QA_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe"});
  const patientPage=await browser.newPage({viewport:{width:320,height:900}});
  patientPage.setDefaultTimeout(60000);
  await patientPage.goto(base+"/pacientes/login");await patientPage.getByLabel("Correo electrónico",{exact:true}).fill(accounts.a.email);await patientPage.getByLabel("Contraseña",{exact:true}).fill(password);await patientPage.getByRole("button",{name:"Entrar a mi biblioteca"}).click();await patientPage.waitForURL(base+"/pacientes");
  console.log("QA: patient login accepted; checking real mobile material navigation.");
  await patientPage.getByRole("link",{name:`QA ${run} informe A`,exact:true}).click();
  await patientPage.waitForURL(base+`/pacientes/materiales/${report}`);
  await patientPage.getByRole("heading",{name:`QA ${run} informe A`,level:1}).waitFor();checks.push("A signs in and opens real published individual material at 320px");
  await patientPage.getByRole("button",{name:"☆ Guardar favorito"}).click();await patientPage.getByText("Guardado en favoritos.",{exact:true}).waitFor();checks.push("Favorite persists through authenticated server action");
  assert.equal(await patientPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log("QA: patient material and favorite verified; checking the existing administrator login.");
  const staffPage=await browser.newPage();await staffPage.goto(base+"/admin/login");await staffPage.locator('input[type="email"]').fill(accounts.staff.email);await staffPage.locator('input[type="password"]').fill(password);await staffPage.locator('button[type="submit"]').click();await staffPage.waitForURL(base+"/admin");
  await staffPage.emulateMedia({reducedMotion:"reduce"});
  const createdEmail=`portal-qa-${run}-created@example.test`;
  await staffPage.goto(base+"/admin/pacientes");
  await staffPage.getByRole("link",{name:"Nuevo paciente",exact:true}).click();
  assert.equal(await staffPage.getByLabel("Enviar acceso por correo ahora").isDisabled(),!captureEmail);
  if(captureEmail) await staffPage.getByLabel("Enviar acceso por correo ahora").uncheck();
  await staffPage.getByLabel("Nombre del paciente",{exact:true}).fill("QA alta desde administrador");
  await staffPage.getByLabel("Correo del paciente",{exact:true}).fill(createdEmail);
  await staffPage.getByRole("button",{name:"Guardar sin enviar",exact:true}).click();
  await staffPage.waitForURL(base+"/admin/pacientes?resultado=paciente-guardado");
  const created=check(await service.from("patient_profiles").select("id,auth_user_id,invitation_state").eq("email",createdEmail).single());fixture.patients.push(created.id);
  assert.equal(created.auth_user_id,null);assert.equal(created.invitation_state,"pending");
  checks.push("Authorized administrator creates a real patient profile without sending email when not requested");
  await staffPage.getByRole("link",{name:"Nuevo paciente",exact:true}).click();
  if(captureEmail) await staffPage.getByLabel("Enviar acceso por correo ahora").uncheck();
  await staffPage.getByLabel("Nombre del paciente",{exact:true}).fill("QA alta actualizada");
  await staffPage.getByLabel("Correo del paciente",{exact:true}).fill(createdEmail);
  await staffPage.getByRole("button",{name:"Guardar sin enviar",exact:true}).click();
  await staffPage.locator(".patient-admin-identity").getByText("QA alta actualizada",{exact:true}).waitFor();
  const repeated=check(await service.from("patient_profiles").select("id,display_name").eq("email",createdEmail).single());
  assert.equal(repeated.id,created.id);assert.equal(repeated.display_name,"QA alta actualizada");checks.push("Repeating the same email updates one profile without duplicating the patient");
  if(captureEmail){
    await staffPage.goto(base+"/admin/pacientes/nuevo");
    const invitedEmail=`portal-qa-${run}-invited@example.test`;
    await staffPage.getByLabel("Nombre del paciente",{exact:true}).fill("QA invitación local");
    await staffPage.getByLabel("Correo del paciente",{exact:true}).fill(invitedEmail);
    assert.equal(await staffPage.getByLabel("Enviar acceso por correo ahora").isChecked(),true);
    await staffPage.getByRole("button",{name:"Crear y enviar acceso",exact:true}).click();
    await staffPage.waitForURL(base+"/admin/pacientes?resultado=acceso-enviado");
    const invited=check(await service.from("patient_profiles").select("id,auth_user_id,invitation_state").eq("email",invitedEmail).single());
    fixture.patients.push(invited.id);assert.ok(invited.auth_user_id);fixture.users.push(invited.auth_user_id);
    assert.equal(invited.invitation_state,"sent");
    const inviteLink=await capturedLink(invitedEmail,"invite");
    const invitedPage=await browser.newPage({viewport:{width:320,height:900}});
    await invitedPage.goto(inviteLink);await invitedPage.waitForURL(base+"/pacientes/activar");
    const invitedPassword=`Bb2!${randomBytes(18).toString("hex")}`;
    await setPatientPassword(invitedPage,invitedPassword);
    assert.equal(await invitedPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    checks.push("Administrator invitation is captured locally, exchanges a real Auth token and patient sets password at 320px");
    const invitedLogin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    check(await invitedLogin.auth.signInWithPassword({email:invitedEmail,password:invitedPassword}));
    assert.equal(check(await invitedLogin.rpc("library_patient_material",{mid:report})),null);
    checks.push("New invited patient can log in and cannot read another patient's individual report");
    const reusedPage=await browser.newPage();await reusedPage.goto(inviteLink);
    await reusedPage.waitForURL(base+"/pacientes/login?reason=invite-invalid");
    await reusedPage.getByRole("alert").filter({hasText:"El enlace no es válido"}).waitFor();
    assert.equal(await reusedPage.locator("details.library-recovery").evaluate(element=>element.open),true);
    checks.push("Used invitation token is rejected with a clear recovery option");
    await staffPage.goto(base+"/admin/pacientes");
    const card=staffPage.getByRole("row").filter({hasText:invitedEmail});
    await card.getByRole("button",{name:"Enviar nuevo enlace",exact:true}).click();
    await staffPage.getByRole("dialog").getByRole("button",{name:"Confirmar envío",exact:true}).click();
    await staffPage.waitForURL(base+"/admin/pacientes?resultado=acceso-enviado");
    const recoveryLink=await capturedLink(invitedEmail,"recovery");
    const recoveryPage=await browser.newPage();await recoveryPage.goto(recoveryLink);await recoveryPage.waitForURL(base+"/pacientes/activar");
    const recoveredPassword=`Cc3!${randomBytes(18).toString("hex")}`;
    await setPatientPassword(recoveryPage,recoveredPassword);
    check(await invitedLogin.auth.signInWithPassword({email:invitedEmail,password:recoveredPassword}));
    assert.ok((await invitedLogin.auth.signInWithPassword({email:invitedEmail,password:invitedPassword})).error);
    assert.equal(check(await service.from("patient_profiles").select("id").eq("email",invitedEmail).single()).id,invited.id);
    checks.push("Existing patient recovers password through captured email without duplicate profile or account");
  }
  // Exercise the directory with real local profiles, including actions, search and pagination.
  await staffPage.goto(base+"/admin/pacientes");
  await staffPage.getByLabel("Buscar por nombre o correo").fill(createdEmail);
  await staffPage.getByRole("button",{name:"Buscar",exact:true}).click();
  await staffPage.getByText("1 paciente encontrado",{exact:true}).waitFor();
  assert.equal(await staffPage.locator("tbody tr").count(),1);
  checks.push("Patient directory searches the backend by email and shows the exact result count");
  let createdRow=staffPage.getByRole("row").filter({hasText:createdEmail});
  await createdRow.getByRole("button",{name:"Suspender acceso",exact:true}).click();
  await staffPage.getByRole("dialog").getByRole("button",{name:"Cancelar",exact:true}).click();
  assert.equal(check(await service.from("patient_profiles").select("is_active").eq("id",created.id).single()).is_active,true);
  await createdRow.getByRole("button",{name:"Suspender acceso",exact:true}).click();
  await staffPage.getByRole("dialog").getByRole("button",{name:"Suspender acceso",exact:true}).click();
  await staffPage.waitForURL(base+"/admin/pacientes?resultado=acceso-suspendido&guardado=1");
  assert.equal(check(await service.from("patient_profiles").select("is_active").eq("id",created.id).single()).is_active,false);
  checks.push("Cancelling suspension changes nothing; confirming suspends the real profile and displays feedback");
  await staffPage.getByRole("link",{name:"Suspendidos",exact:true}).click();
  createdRow=staffPage.getByRole("row").filter({hasText:createdEmail});
  await createdRow.getByText("Suspendido",{exact:true}).waitFor();
  assert.equal(await createdRow.getByRole("button",{name:"Enviar acceso",exact:true}).count(),0);
  await createdRow.getByRole("button",{name:"Habilitar acceso",exact:true}).click();
  await staffPage.getByRole("dialog").getByRole("button",{name:"Habilitar acceso",exact:true}).click();
  await staffPage.waitForURL(base+"/admin/pacientes?resultado=acceso-habilitado&guardado=1");
  assert.equal(check(await service.from("patient_profiles").select("is_active").eq("id",created.id).single()).is_active,true);
  checks.push("Suspended filter and explicit reactivation work without sending email");
  await staffPage.getByRole("link",{name:"Por invitar",exact:true}).click();
  await staffPage.waitForURL(base+"/admin/pacientes?estado=por-invitar");
  await staffPage.locator(".patient-admin-identity").getByText("QA alta actualizada",{exact:true}).waitFor();
  assert.equal(await staffPage.locator(".patient-admin-identity").getByText("QA local suspended",{exact:true}).count(),0);
  checks.push("Invitation filter excludes suspended patients");
  // Literal punctuation and wildcard search must not expand into a PostgREST filter.
  const specialName='QA %_,(comillas" y barra\\)';
  check(await service.from("patient_profiles").update({display_name:specialName}).eq("id",created.id));
  await staffPage.goto(base+"/admin/pacientes?q="+encodeURIComponent(specialName));
  await staffPage.locator(".patient-admin-identity").getByText(specialName,{exact:true}).waitFor();
  assert.equal(await staffPage.locator("tbody tr").count(),1);
  await staffPage.goto(base+"/admin/pacientes?q="+encodeURIComponent("no-existe-"+run));
  await staffPage.getByRole("heading",{name:"No hay pacientes con estos filtros",exact:true}).waitFor();
  checks.push("Literal search handles punctuation and wildcards safely and provides an empty state");
  check(await service.from("patient_profiles").update({display_name:"QA alta actualizada"}).eq("id",created.id));
  const paginationRows=check(await service.from("patient_profiles").insert(Array.from({length:26},(_,index)=>({display_name:`QA página ${String(index+1).padStart(2,"0")}`,email:`portal-qa-${run}-page-${index}@example.test`}))).select("id"));
  fixture.patients.push(...paginationRows.map(row=>row.id));
  await staffPage.goto(base+"/admin/pacientes?q="+encodeURIComponent("QA página"));
  await staffPage.getByText("26 pacientes encontrados",{exact:true}).waitFor();
  assert.equal(await staffPage.locator("tbody tr").count(),25);
  await staffPage.getByRole("link",{name:"Siguiente",exact:true}).click();
  await staffPage.locator(".patient-admin-identity").getByText("QA página 26",{exact:true}).waitFor();
  assert.equal(await staffPage.locator("tbody tr").count(),1);
  await staffPage.getByRole("link",{name:"Anterior",exact:true}).click();
  await staffPage.locator(".patient-admin-identity").getByText("QA página 01",{exact:true}).waitFor();
  checks.push("Directory paginates real backend rows and retains the search across pages");
  await staffPage.goto(base+"/admin/pacientes?q="+encodeURIComponent("QA local"));
  await staffPage.screenshot({path:"tmp/patient-library-qa/admin-patients-desktop.png",fullPage:true});
  for(const width of [320,375,768]) {
    await staffPage.setViewportSize({width,height:900});
    assert.equal(await staffPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Patient directory overflow at ${width}px`);
    await staffPage.screenshot({path:`tmp/patient-library-qa/admin-patients-${width}.png`,fullPage:true});
  }
  await staffPage.setViewportSize({width:320,height:900});
  await staffPage.getByRole("row").filter({hasText:accounts.a.email}).getByRole("button",{name:"Suspender acceso",exact:true}).click();
  await staffPage.getByRole("dialog").waitFor();
  assert.equal(await staffPage.getByRole("dialog").evaluate(element=>element.scrollWidth>element.clientWidth),false);
  await staffPage.screenshot({path:"tmp/patient-library-qa/admin-patient-confirm-mobile.png"});
  await staffPage.keyboard.press("Escape");
  assert.equal(await staffPage.getByRole("dialog").count(),0);
  checks.push("Confirmation fits 320px, identifies the patient and supports Escape without changing access");
  await staffPage.goto(base+"/admin/pacientes/nuevo");
  assert.equal(await staffPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await staffPage.screenshot({path:"tmp/patient-library-qa/admin-patient-new-mobile.png",fullPage:true});
  checks.push("Directory and creation screen fit mobile and tablet widths without horizontal overflow");
  await staffPage.goto(base+"/admin/pacientes/permisos",{waitUntil:"commit",timeout:60000});
  await staffPage.getByRole("heading",{name:"Tu cuenta no tiene permisos para esta sección.",exact:true}).waitFor();
  const superPage=await browser.newPage();
  superPage.setDefaultNavigationTimeout(60000);
  await superPage.goto(base+"/admin/login");await superPage.locator('input[type="email"]').fill(accounts.superadmin.email);await superPage.locator('input[type="password"]').fill(password);await superPage.locator('button[type="submit"]').click();await superPage.waitForURL(base+"/admin");
  await superPage.goto(base+"/admin/pacientes");
  await superPage.getByRole("link",{name:"Configurar permisos del equipo",exact:true}).click();
  const teamCard=superPage.locator("section.patient-admin-team-card").filter({hasText:accounts.superadmin.email});
  await teamCard.getByRole("heading",{name:"QA Administradora",exact:true}).waitFor();
  assert.equal(await superPage.locator(".patient-admin-team").getByText(accounts.superadmin.id,{exact:true}).count(),0);
  await teamCard.getByLabel("Gestionar pacientes y grupos",{exact:false}).check();
  await teamCard.getByRole("button",{name:"Guardar permisos",exact:true}).click();
  await superPage.waitForURL(base+"/admin/pacientes/permisos?guardado=1");
  assert.deepEqual(check(await service.from("therapeutic_staff_permissions").select("manage_access,manage_content,read_content").eq("user_id",accounts.superadmin.id).single()),{manage_access:true,manage_content:false,read_content:false});
  await superPage.setViewportSize({width:320,height:900});
  assert.equal(await superPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await superPage.screenshot({path:"tmp/patient-library-qa/admin-patient-permissions-mobile.png",fullPage:true});
  checks.push("Team permissions require superadmin, use human identities and save without granting content access");
  const begin=await staffPage.request.post(base+"/api/pacientes/adjuntos",{headers:{origin:base},data:{material_id:report,version:1,replaces_id:"",name:"local.pdf",size:42}});assert.equal(begin.status(),200);const pending=await begin.json();fixture.objects.push(pending.path);
  const pdf=qaPdf();
  check(await staff.storage.from("patient-library").uploadToSignedUrl(pending.path,pending.token,pdf,{contentType:"application/pdf"}));
  const invalidFinish=await staffPage.request.post(base+`/api/pacientes/adjuntos/${pending.id}/finalizar`,{headers:{origin:base}});assert.equal(invalidFinish.status(),400);checks.push("Server rejects stored bytes whose size differs from authorization");
  // Retire failed attempt, then upload validated bytes with the current material version.
  const current=check(await staff.from("patient_library_materials").select("version").eq("id",report).single());check(await staff.rpc("library_manage",{op:"attachment_retire",p:{id:pending.id,version:current.version}}));
  const current2=check(await staff.from("patient_library_materials").select("version").eq("id",report).single());
  const begin2=await staffPage.request.post(base+"/api/pacientes/adjuntos",{headers:{origin:base},data:{material_id:report,version:current2.version,replaces_id:"",name:"local.pdf",size:pdf.length}});assert.equal(begin2.status(),200);const ready=await begin2.json();fixture.objects.push(ready.path);
  check(await staff.storage.from("patient-library").uploadToSignedUrl(ready.path,ready.token,pdf,{contentType:"application/pdf"}));
  assert.equal((await staffPage.request.post(base+`/api/pacientes/adjuntos/${ready.id}/finalizar`,{headers:{origin:base}})).status(),200);checks.push("Direct signed upload becomes ready only after server verification");
  assert.ok((await staff.storage.from("patient-library").uploadToSignedUrl(ready.path,ready.token,pdf,{contentType:"application/pdf",upsert:true})).error);
  checks.push("Reusing the upload token with upsert cannot overwrite a verified object");
  assert.equal((await patientPage.request.get(base+`/api/pacientes/archivos/${ready.id}`)).status(),200);checks.push("Authorized patient downloads private file");
  const inline=await patientPage.request.get(base+`/api/pacientes/archivos/${ready.id}?vista=1`);
  assert.equal(inline.status(),200);assert.equal(inline.headers()["content-type"],"application/pdf");assert.match(inline.headers()["content-disposition"],/^inline;/);assert.match(inline.headers()["cache-control"],/no-store/);
  checks.push("Valid PDF preview response is authenticated, inline and not cached");
  const maxBytes=20*1024*1024;
  let padding=maxBytes-qaPdf(maxBytes).length+maxBytes;
  let largePdf=qaPdf(padding);padding+=maxBytes-largePdf.length;largePdf=qaPdf(padding);
  assert.equal(largePdf.length,maxBytes);
  const beforeLarge=check(await staff.from("patient_library_materials").select("version").eq("id",report).single());
  const beginLarge=await staffPage.request.post(base+"/api/pacientes/adjuntos",{headers:{origin:base},data:{material_id:report,version:beforeLarge.version,replaces_id:"",name:"local-20mb.pdf",size:maxBytes}});
  assert.equal(beginLarge.status(),200);const large=await beginLarge.json();fixture.objects.push(large.path);
  check(await staff.storage.from("patient-library").uploadToSignedUrl(large.path,large.token,largePdf,{contentType:"application/pdf"}));
  assert.equal((await staffPage.request.post(base+`/api/pacientes/adjuntos/${large.id}/finalizar`,{headers:{origin:base},timeout:60000})).status(),200);
  const largeDownload=await patientPage.request.get(base+`/api/pacientes/archivos/${large.id}`,{timeout:60000});assert.equal(largeDownload.status(),200);
  const downloaded=await largeDownload.body();assert.equal(downloaded.length,maxBytes);
  assert.equal(createHash("sha256").update(downloaded).digest("hex"),createHash("sha256").update(largePdf).digest("hex"));
  checks.push("A real 20 MB PDF uploads, validates and downloads with identical bytes through private Storage");
  const bPage=await browser.newPage();await bPage.goto(base+"/pacientes/login");await bPage.getByLabel("Correo electrónico",{exact:true}).fill(accounts.b.email);await bPage.getByLabel("Contraseña",{exact:true}).fill(password);await bPage.getByRole("button",{name:"Entrar a mi biblioteca"}).click();await bPage.waitForURL(base+"/pacientes");
  assert.equal((await bPage.request.get(base+`/api/pacientes/archivos/${ready.id}`)).status(),404);checks.push("B cannot download A attachment by UUID");
  check(await staff.rpc("library_manage",{op:"patient_status",p:{id:accounts.a.patientId,is_active:false}}));assert.equal((await patientPage.request.get(base+`/api/pacientes/archivos/${ready.id}`)).status(),404);checks.push("Suspension revokes downloads with existing browser session");
  await mkdir("tmp/patient-library-qa",{recursive:true});await writeFile("tmp/patient-library-qa/e2e.json",JSON.stringify({status:"PASS",emailCapture:captureEmail,checks},null,2));console.log(`PASS: ${checks.length} local Supabase E2E checks. Email delivery ${captureEmail ? "captured only in local Mailpit" : "disabled"}.`);
} catch(error) {
  // Playwright failure messages can include the email URL. Never persist its token.
  console.error(error.message.replace(/token_hash=[^&\s"')]+/g,"token_hash=[redacted]"));
  await mkdir("tmp/patient-library-qa",{recursive:true});
  await writeFile("tmp/patient-library-qa/e2e.json",JSON.stringify({status:"FAIL",emailCapture:captureEmail,passedChecks:checks},null,2));
  if(browser){
    const diagnostics=[];
    for(const context of browser.contexts()) for(const [index,page] of context.pages().entries()){
      if(["/pacientes","/admin"].some(prefix=>new URL(page.url()).pathname.startsWith(prefix))){
        try{
          diagnostics.push(await page.evaluate(()=>({path:location.pathname,ready:document.readyState,height:document.body.scrollHeight,headings:[...document.querySelectorAll("h1")].map(h=>({text:h.textContent,rect:h.getBoundingClientRect().toJSON()})),cards:[...document.querySelectorAll(".library-material-card")].map(card=>({rect:card.getBoundingClientRect().toJSON(),display:getComputedStyle(card).display,visibility:getComputedStyle(card).visibility}))})));
          await page.screenshot({path:`tmp/patient-library-qa/e2e-failure-${index}.png`,fullPage:true,timeout:5000});
        }catch{ /* Never replace the primary failure with a diagnostic failure. */ }
      }
    }
    await writeFile("tmp/patient-library-qa/e2e-failure.json",JSON.stringify(diagnostics,null,2));
  }
  process.exitCode=1;
} finally {
  await browser?.close();server?.kill();
  if(fixture.objects.length)await service.storage.from("patient-library").remove(fixture.objects);
  // Cleanup only UUIDs created by this run in the guarded loopback database.
  if(fixture.materials.length){await service.from("patient_library_attachments").delete().in("material_id",fixture.materials);await service.from("patient_library_materials").delete().in("id",fixture.materials);}
  if(fixture.patients.length){await service.from("therapy_group_memberships").delete().in("patient_id",fixture.patients);await service.from("patient_profiles").delete().in("id",fixture.patients);}
  if(fixture.groups.length)await service.from("therapy_groups").delete().in("id",fixture.groups);
  const blocked=[];
  for(const id of fixture.users){const result=await service.auth.admin.deleteUser(id);if(result.error)blocked.push(id);}
  // The last-superadmin guard intentionally prevents Auth cascade deletion. The
  // dedicated runner can retire ONLY these recorded local fixtures in a transaction.
  await writeFile("tmp/patient-library-qa/pending-auth-cleanup.json",JSON.stringify({run,ids:blocked}));
  if(blocked.length && process.env.PATIENT_QA_DEDICATED_CLEANUP!=="true"){
    console.error("Local QA accounts remain protected; run the dedicated patient-local runner to complete cleanup.");process.exitCode=1;
  }
}
