import assert from "node:assert/strict";
import { randomBytes,randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { seedDemo,removeDemo } from "../src/lib/demo/service.ts";
import type { Database } from "../src/types/database.ts";
import { validateClinicalPayload } from "../src/lib/care/records.ts";
import { createRequire } from "node:module";
import { mkdir,writeFile } from "node:fs/promises";
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,"http://127.0.0.1:54421");
const service=createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
const client=createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
const password=randomBytes(32).toString("base64url");
const unwrap=<T>(r:{data:T;error:{message:string}|null})=>{if(r.error)throw Error(r.error.message);return r.data;};
async function sql(input:string){return new Promise<string>((resolve,reject)=>{const p=spawn("C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe",["exec","-i","supabase_db_castelao-patient-qa","psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-t","-A"],{windowsHide:true,stdio:["pipe","pipe","pipe"]});let stdout="",stderr="";p.stdout.on("data",d=>stdout+=d);p.stderr.on("data",d=>stderr+=d);p.stdin.end(input);p.on("error",reject);p.on("close",code=>code?reject(Error(stderr)):resolve(stdout.trim()));});}
const owner=unwrap(await service.auth.admin.createUser({email:`demo-owner-qa-${randomBytes(5).toString("hex")}@example.test`,password,email_confirm:true})).user!;
let bid="";let server:ReturnType<typeof spawn>|undefined;let browser:{close:()=>Promise<void>}|undefined;const checks:string[]=[],screens:object[]=[],pageErrors:string[]=[];const protectedPatient=randomUUID();
function pass(label:string){checks.push(label);console.log('PASS '+label);}
const out='tmp/care-qa/demo';await mkdir(out,{recursive:true});
try {
 await sql(`insert into public.admin_users(user_id,role,is_active)values('${owner.id}','superadmin',true);`);
 await sql(`insert into public.patient_profiles(id,email,display_name)values('${protectedPatient}','protected-demo-qa@example.test','Paciente anterior QA');`);
 unwrap(await client.auth.signInWithPassword({email:owner.email!,password}));
 bid=unwrap(await service.rpc("demo_begin",{actor:owner.id}));
 const fingerprints=await sql(`select private.demo_user_fingerprints('${bid}');`);
 const originalSettings=await sql("select md5(coalesce(jsonb_agg(to_jsonb(s))::text,''))from public.site_settings s;select md5(coalesce(jsonb_agg(to_jsonb(r)order by id)::text,''))from public.care_recovery_rubrics r;select count(*)from public.analytics_daily;select count(*)from cron.job where active;");
 const result=await seedDemo(service,owner.id);assert.equal(result.id,bid);console.log("PASS seed",JSON.stringify(result.summary));
 assert.equal((await seedDemo(service,owner.id)).id,bid);pass("idempotency: one batch and eight identities");
 assert.equal(await sql(`select private.demo_user_fingerprints('${bid}');`),fingerprints);pass('existing Auth identities unchanged');
 assert.equal(await sql("select md5(coalesce(jsonb_agg(to_jsonb(s))::text,''))from public.site_settings s;select md5(coalesce(jsonb_agg(to_jsonb(r)order by id)::text,''))from public.care_recovery_rubrics r;select count(*)from public.analytics_daily;select count(*)from cron.job where active;"),originalSettings);pass('settings, rubric, analytics and cron unchanged');
 const status=unwrap(await client.rpc("demo_status")) as unknown as {id:string;patients:{id:string}[];summary:Record<string,string|number>}[];const batch=status.find(b=>b.id===bid)!;assert.ok(batch);
 const accounts=unwrap(await service.rpc('demo_service_state',{bid})) as unknown as {accounts:{id:string;slot:string;email:string}[]};assert.equal(accounts.accounts.length,8);
 for(const a of accounts.accounts){const u=unwrap(await service.auth.admin.getUserById(a.id)).user!;assert.ok(new Date(u.banned_until!)>new Date());}pass('all eight DEMO identities blocked');
 const anonymous=createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
 assert.ok((await anonymous.rpc('demo_status')).error);assert.ok((await client.rpc('demo_seed',{bid})).error);assert.ok((await client.rpc('demo_begin',{actor:owner.id})).error);pass('anonymous and normal clients cannot seed or access private registry');
 const editor=accounts.accounts.find(a=>a.slot==='editor')!;unwrap(await service.auth.admin.updateUserById(editor.id,{ban_duration:'none',password}));
 const lowerRole=createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});unwrap(await lowerRole.auth.signInWithPassword({email:editor.email,password}));
 assert.ok((await lowerRole.rpc('demo_status')).error);assert.ok((await lowerRole.rpc('demo_remove_data',{bid})).error);pass('editor cannot read or remove the demonstration');
 unwrap(await service.auth.admin.updateUserById(editor.id,{ban_duration:'876000h'}));
 const clinical=JSON.parse(await sql(`select jsonb_agg(jsonb_build_object('specialty',r.specialty,'payload',v.payload))from public.care_session_records r join private.care_record_versions v on v.record_id=r.id where r.patient_id=any((select patient_ids from private.demo_batches where id='${bid}')::uuid[]);`));
 for(const row of clinical)validateClinicalPayload(row.specialty,row.payload,true);pass('all clinical example payloads match strict module schemas');
 assert.equal(await sql(`select count(*)from public.content_posts where author_id in(select user_id from private.demo_accounts where batch_id='${bid}')and(status<>'draft'or published_at is not null);`),'0');pass('all website examples remain unpublished');
 const group=await sql(`select(group_ids)[1]from private.demo_batches where id='${bid}';`);
 await sql(`insert into public.therapy_group_memberships(group_id,patient_id)values('${group}','${protectedPatient}');`);
 assert.ok((await client.rpc('demo_remove_data',{bid})).error);assert.equal((unwrap(await service.rpc('demo_service_state',{bid})) as unknown as {state:string}).state,'active');
 await sql(`delete from public.therapy_group_memberships where group_id='${group}'and patient_id='${protectedPatient}';`);pass('real-patient crosslink blocks removal atomically');
 // Real pages and the cleanup modal, with the unchanged existing Director login.
 const require=createRequire(import.meta.url);process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Git/castelaochile/tmp/playwright-mobile';
 const {chromium,webkit}=require(require.resolve('playwright',{paths:['C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3450'],{windowsHide:true,env:process.env,stdio:'ignore'});
 for(let i=0;i<60;i++){try{if((await fetch('http://localhost:3450/admin/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 for(const[engine,launcher]of[['chromium',chromium],['webkit',webkit]]){
  const b=await launcher.launch(engine==='chromium'?{headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{headless:true});browser=b;
  const context=await b.newContext();const p=await context.newPage();p.setDefaultTimeout(30000);p.on('pageerror',(e:Error)=>pageErrors.push(e.message));
  await p.goto('http://localhost:3450/admin/login');await p.getByLabel('Correo institucional',{exact:true}).fill(owner.email!);await p.getByLabel('Contraseña',{exact:true}).fill(password);await p.getByRole('button',{name:'Ingresar',exact:true}).click();await p.waitForURL('http://localhost:3450/admin');
  const patient=batch.patients[0].id;const s=batch.summary;
  const routes=['/admin/demostracion',`/admin/analitica?demo=${bid}`,`/admin/biblioteca?q=DEMO&area=${s.area_id}`,`/admin/seguimiento/pacientes/${patient}`,`/admin/seguimiento/pacientes/${patient}/recovery/semanal?semana=${s.recovery_week}`,`/admin/seguimiento/pacientes/${patient}/autonomia`,`/admin/seguimiento/pacientes/${patient}/familia`,`/admin/seguimiento/pacientes/${patient}/registros`,`/admin/seguimiento/pacientes/${patient}/reportes`,`/admin/seguimiento/pacientes/${patient}/decisiones`,`/admin/seguimiento/agenda?profesional=${s.coach_id}&dias=30`,`/admin/seguimiento/informes/${s.weekly_report_id}`,'/admin/contenidos?status=draft&q=DEMO','/admin/equipo','/admin/paginas','/admin/consultas','/admin/grupos-terapeuticos','/admin/usuarios','/admin/configuracion','/admin/seguimiento/indicadores','/admin/seguimiento/alertas','/admin/seguimiento/programaciones'];
  for(const[ri,route]of routes.entries()){
   const response=await p.goto('http://localhost:3450'+route);assert.equal(response.status(),200,route);await p.locator('h1').first().waitFor();await p.locator('.admin-skeleton').first().waitFor({state:'hidden'});
   assert.equal(await p.getByText(/Application error|Something went wrong|Tu cuenta no tiene permisos/).count(),0,route);if(route.startsWith('/admin/seguimiento/agenda?')){await p.getByRole('heading',{name:'Agenda del centro',exact:true}).waitFor();assert.ok(await p.locator('.care-agenda-card').count()>0,'actual agenda rows rendered');}
   for(const width of[320,375,768,1440]){await p.setViewportSize({width,height:900});await p.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow){await p.screenshot({path:out+'/overflow.png',fullPage:true});console.log(await p.evaluate(()=>({viewport:innerWidth,root:document.documentElement.scrollWidth,body:document.body.scrollWidth,nodes:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1||e.scrollWidth>e.clientWidth+2).slice(0,25).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth,overflow:getComputedStyle(e).overflowX,position:getComputedStyle(e).position}))})));}assert.equal(overflow,false,engine+' '+route+' '+width);screens.push({engine,route,width,status:'PASS'});if(ri<=1||route.startsWith('/admin/seguimiento/agenda?'))await p.screenshot({path:`${out}/${engine}-${ri}-${width}.png`,fullPage:true});}
  }pass(engine+' presentation pages and responsive layouts');
  await p.setViewportSize({width:1440,height:900});await p.goto('http://localhost:3450/admin/demostracion');
  const agendaModule=p.locator('.admin-demo-grid .admin-panel').filter({has:p.getByRole('heading',{name:'Agenda del centro',exact:true})});
  await agendaModule.getByRole('link',{name:'Abrir módulo',exact:true}).click();await p.getByRole('heading',{name:'Agenda del centro',exact:true}).waitFor();
  assert.equal(await p.getByLabel('Profesional',{exact:true}).inputValue(),String(s.coach_id));assert.ok(await p.locator('.care-agenda-card').count()>0);pass(engine+' DEMO agenda link renders the coach activities');
  await p.getByLabel('Estado de la actividad',{exact:true}).selectOption('scheduled');await p.getByRole('button',{name:'Ver agenda',exact:true}).click();await p.waitForURL('**/agenda?**estado=scheduled**');
  await p.getByRole('heading',{name:'Agenda del centro',exact:true}).waitFor();assert.equal(await p.locator('.care-agenda-card').count(),3);assert.equal(await p.locator('.care-agenda-card:not([data-state=scheduled])').count(),0);pass(engine+' scheduled filter shows the three upcoming DEMO activities');
  const activity=p.locator('.care-agenda-card').first();const activityTitle=await activity.getByRole('heading',{level:3}).textContent();await activity.getByRole('link',{name:'Abrir actividad',exact:true}).click();await p.getByRole('heading',{level:1,name:activityTitle,exact:true}).waitFor();pass(engine+' agenda opens the real activity detail');
  await p.goto('http://localhost:3450/admin/seguimiento/agenda?dias=90');await p.getByRole('heading',{name:'Agenda del centro',exact:true}).waitFor();assert.equal(await p.locator('.care-agenda-card').count(),25);await p.getByRole('link',{name:'Siguiente',exact:true}).click();await p.waitForURL('**pagina=2');await p.getByRole('heading',{name:'Agenda del centro',exact:true}).waitFor();assert.equal(await p.locator('.care-agenda-card').count(),17);pass(engine+' centre agenda paginates all 42 participations');
  await p.goto('http://localhost:3450/admin/seguimiento/mi-trabajo');await p.getByRole('heading',{name:'Mi agenda y pendientes',exact:true}).waitFor();assert.equal(await p.locator('.care-card').count(),0);pass(engine+' personal agenda retains its own professional filter');
  if(engine==='chromium'){
   const coach=accounts.accounts.find(a=>a.slot==='recovery')!;unwrap(await service.auth.admin.updateUserById(coach.id,{ban_duration:'none',password}));
   const professionalContext=await b.newContext(),professionalPage=await professionalContext.newPage();
   await professionalPage.goto('http://localhost:3450/admin/login');await professionalPage.getByLabel('Correo institucional',{exact:true}).fill(coach.email);await professionalPage.getByLabel('Contraseña',{exact:true}).fill(password);await professionalPage.getByRole('button',{name:'Ingresar',exact:true}).click();await professionalPage.waitForURL('http://localhost:3450/admin');
   assert.equal((await professionalPage.goto('http://localhost:3450/admin/seguimiento/agenda')).status(),403);
   assert.equal((await professionalPage.goto('http://localhost:3450/admin/seguimiento/mi-trabajo?dias=30')).status(),200);await professionalPage.getByRole('heading',{name:'Mi agenda y pendientes',exact:true}).waitFor();assert.ok(await professionalPage.getByText('DEMO · Próxima actividad Recovery',{exact:true}).count()>0);assert.equal(await professionalPage.getByText('DEMO · Sesión psicológica',{exact:true}).count(),0);pass('clinical role keeps its own agenda and cannot enter the centre agenda');
   await professionalContext.close();unwrap(await service.auth.admin.updateUserById(coach.id,{ban_duration:'876000h'}));
  }

  await p.goto(`http://localhost:3450/admin/biblioteca/${s.material_id}/vista-previa?paciente=${patient}`);await p.getByRole('button',{name:'Leer aquí',exact:true}).click();await p.getByText('Página 1 de 1',{exact:true}).waitFor();await p.locator('.library-reader-text').waitFor();assert.equal(await p.locator('.library-reader [role=alert]').count(),0);await p.screenshot({path:`${out}/${engine}-demo-pdf.png`,fullPage:true});pass(engine+' DEMO PDF reads within the app');
  await p.goto('http://localhost:3450/admin/demostracion');await p.getByRole('button',{name:'Eliminar demostración',exact:true}).first().click();const modal=p.getByRole('dialog',{name:'Eliminar datos DEMO',exact:true});await modal.waitFor();await p.setViewportSize({width:320,height:620});const box=await modal.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=321);await p.screenshot({path:`${out}/${engine}-removal-modal.png`});await p.getByRole('button',{name:'Cancelar',exact:true}).click();pass(engine+' short removal modal fits mobile');
  if(engine==='webkit'){
   unwrap(await client.rpc('demo_remove_data',{bid}));assert.ok((await client.rpc('demo_finish_removal',{bid})).error);pass('partial removal remains resumable until files and accounts are gone');
   await p.getByRole('button',{name:'Eliminar demostración',exact:true}).first().click();await p.getByLabel('Escribe ELIMINAR DEMO',{exact:true}).fill('ELIMINAR DEMO');await p.getByRole('button',{name:'Eliminar datos DEMO',exact:true}).click();await p.waitForURL('**/admin/demostracion?retirado=1');await p.getByText('Demostración retirada: registros, archivos y cuentas de ejemplo eliminados.',{exact:true}).waitFor();pass('complete batch removed using authenticated UI action');
  }
  await b.close();browser=undefined;
 }
 assert.equal(pageErrors.length,0);pass('no browser page errors');
 assert.ok(!(unwrap(await client.rpc("demo_status")) as unknown as {id:string}[]).some(b=>b.id===bid));
 await removeDemo(client,service,bid);pass('completed removal is idempotent');
 assert.equal(await sql(`select private.demo_user_fingerprints('${bid}');`),fingerprints);pass('original Auth identities preserved after removal');
 assert.equal(await sql(`select count(*)from public.patient_profiles where id='${protectedPatient}';select count(*)from private.demo_objects where batch_id='${bid}';select count(*)from auth.users where raw_app_meta_data->>'castelao_demo_batch'='${bid}';select tgenabled from pg_trigger where tgrelid='public.admin_users'::regclass and tgname='protect_last_active_superadmin';`),'1\n0\n0\nO');pass('protected patient retained; zero DEMO objects/accounts; guard enabled');
 await writeFile(out+'/results.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),checks,screens,cleanup:'complete',summary:result.summary},null,2));
}catch(error){console.error("QA failure:",error instanceof Error?error.message:String(error));throw error;}finally{
 await browser?.close();server?.kill();
 if(bid){const state=unwrap(await service.rpc("demo_service_state",{bid})) as unknown as {state:string};if(state.state!=="removed")await removeDemo(client,service,bid);}
 // QA fixture only; production demo cleanup never disables a trigger.
 await sql(`begin;delete from private.demo_accounts where batch_id in(select id from private.demo_batches where created_by='${owner.id}'and state='removed');delete from private.demo_batches where created_by='${owner.id}'and state='removed';delete from public.patient_profiles where id='${protectedPatient}';delete from public.admin_audit_log where actor_id='${owner.id}';delete from private.care_audit where actor_id='${owner.id}';delete from public.care_staff_capabilities where user_id='${owner.id}';alter table public.admin_users disable trigger protect_last_active_superadmin;delete from auth.users where id='${owner.id}';alter table public.admin_users enable trigger protect_last_active_superadmin;commit;`);
 assert.equal((await service.auth.admin.getUserById(owner.id)).data.user,null);
}
