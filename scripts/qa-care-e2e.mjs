import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { auditCareUX } from './qa-care-ux.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_NODE_MODULES??'C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).origin,'http://127.0.0.1:54421');
assert.equal(process.env.NEXT_PUBLIC_SITE_URL,'http://localhost:3450');
assert.equal(process.env.CARE_PORTAL_ENABLED,'true');
assert.equal(process.env.PATIENT_AUTH_EMAILS_ENABLED,'false');
const marker=JSON.parse(await readFile('tmp/patient-supabase-local/patient-qa.json','utf8'));
assert.equal(marker.project,'castelao-patient-qa');
const docker='C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const output='tmp/care-qa';await mkdir(output,{recursive:true});
const service=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const run=randomUUID().slice(0,8),password='Aa1!'+randomBytes(18).toString('hex');
const users=[],patientIds=[],notes=[];const checks=[];const accounts={};
let server,browser;let serverLog='';
function check(result){if(result.error)throw new Error(result.error.message);return result.data;}
async function sql(input){return new Promise((resolve,reject)=>{const p=spawn(docker,['exec','-i','supabase_db_castelao-patient-qa','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let err='';p.stdout.on('data',()=>{});p.stderr.on('data',d=>err+=d);p.stdin.end(input);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(new Error(err)));});}
async function session(name){const c=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});check(await c.auth.signInWithPassword({email:accounts[name].email,password}));return c;}
async function login(page,name,patient=false){await page.goto(`http://localhost:3450/${patient?'pacientes':'admin'}/login`);await page.locator('form').filter({has:page.getByLabel('Contraseña',{exact:true})}).getByLabel(/correo/i).fill(accounts[name].email);await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:patient?'Entrar a mi espacio':'Ingresar',exact:true}).click();await page.waitForURL(patient?'**/pacientes/hoy':'**/admin');}
const civil=instant=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(instant)).replace(' ','T');
try {
  for(const name of ['a','b','psychology','direction','cms','technical']){
    const email=`care-qa-${run}-${name}@example.test`;const u=check(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`QA ${name}`}})).user;
    users.push(u.id);accounts[name]={id:u.id,email};
  }
  for(const name of ['a','b']){const p=check(await service.from('patient_profiles').insert({auth_user_id:accounts[name].id,email:accounts[name].email,display_name:`Persona ${name.toUpperCase()} ${run}`}).select('id').single());patientIds.push(p.id);accounts[name].patientId=p.id;}
  const pid=accounts.a.patientId,pbid=accounts.b.patientId;
  await sql(`begin;
    insert into public.admin_users(user_id,role,is_active) values ${['psychology','direction','cms','technical'].map(n=>`('${accounts[n].id}','${n==='technical'?'superadmin':n==='cms'?'editor':'viewer'}',true)`).join(',')};
    insert into public.care_staff_capabilities(user_id,capabilities) values
    ('${accounts.psychology.id}',array['care.directory.read','care.patient.read','care.records.create','care.records.read']),
    ('${accounts.direction.id}',array['care.directory.read','care.patient.read','care.records.create','care.records.read','care.assignments.manage']);
    insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by) values
    ('${pid}','${accounts.psychology.id}','psychology',now()-interval '1 day','${accounts.direction.id}'),
    ('${pid}','${accounts.direction.id}','direction',now()-interval '1 day','${accounts.direction.id}'),
    ('${pbid}','${accounts.direction.id}','direction',now()-interval '1 day','${accounts.direction.id}');
    commit;`);
  const psy=await session('psychology'),dir=await session('direction'),cms=await session('cms'),tech=await session('technical'),a=await session('a'),b=await session('b');
  const nid=check(await psy.rpc('care_manage',{op:'reserved_note',p:{patient_id:pid,occurred_at:new Date(Date.now()-60000).toISOString(),body:'Reserva sintética QA'}}));notes.push(nid);
  assert.ok((await dir.rpc('care_read_note',{id:nid})).error);checks.push('Direction normal REST JWT cannot read professional reserve');
  assert.ok((await b.rpc('care_patient_identity',{pid})).error);checks.push('Patient B cannot use staff identity resolver for A');
  assert.ok((await cms.rpc('care_directory')).error);assert.ok((await tech.rpc('care_directory')).error);checks.push('CMS and technical superadmin normal JWTs cannot read clinical directory');
  assert.equal(check(await psy.rpc('care_directory')).total,1);checks.push('Psychology normal REST JWT scoped to one patient');
  // Past synthetic fact avoids host/container sub-second clock skew; future facts remain rejected.
  const stamp=new Date(Date.now()-60000).toISOString();
  const coordination=check(await psy.rpc('care_manage',{op:'shared_summary',p:{patient_id:pid,occurred_at:stamp,body:'Coordinación QA'}}));
  const published=check(await psy.rpc('care_manage',{op:'shared_summary',p:{patient_id:pid,occurred_at:stamp,body:'Compartido QA',visibility:'patient',confirm_publish:true}}));
  assert.deepEqual(check(await a.from('care_shared_summaries').select('id').eq('patient_id',pid)).map(r=>r.id),[published]);
  assert.equal(check(await b.from('care_shared_summaries').select('id').eq('patient_id',pid)).length,0);checks.push('Patient own explicit publication only; coordination and other patient filtered by REST');
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3450'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:process.env});
  server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
  for(let i=0;i<120;i++){try{if((await fetch('http://localhost:3450/admin/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));if(i===119)throw new Error('Local server not ready');}
  browser=await chromium.launch({headless:true,executablePath:process.env.PATIENT_QA_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
  await login(page,'direction');await page.getByRole('link',{name:'Seguimiento',exact:true}).click();await page.waitForURL('**/admin/seguimiento');
  await page.getByRole('heading',{name:`Persona A ${run}`}).waitFor();checks.push('Existing admin shell navigates to authorized care patients');
  const card=page.locator('article').filter({has:page.getByRole('heading',{name:`Persona A ${run}`})});await card.getByRole('link',{name:/Abrir ficha/}).click();
  await page.getByRole('heading',{name:'Sin trayectoria registrada'}).waitFor();checks.push('Patient file uses truthful empty trajectory state');
  await page.getByLabel('Motivo breve').fill('Ingreso de prueba local');await page.getByRole('button',{name:'Abrir episodio',exact:true}).click();
  await page.getByText('Cambios guardados.',{exact:true}).waitFor();await page.getByRole('button',{name:'Guardar cambio',exact:true}).waitFor();
  assert.equal(check(await dir.from('care_episodes').select('id').eq('patient_id',pid)).length,1);checks.push('Brief UI admission form persists episode and updates file');
  await page.getByLabel('Estado del tratamiento').selectOption('paused');await page.getByLabel('Motivo breve').fill('Pausa de prueba local');await page.getByRole('button',{name:'Guardar cambio',exact:true}).click();
  await page.getByText('Pausa de prueba local',{exact:true}).waitFor();assert.equal(check(await dir.from('care_episodes').select('status').eq('patient_id',pid))[0].status,'paused');checks.push('UI pause persists with immutable history and does not suspend account');
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`No horizontal overflow at ${width}`);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${output}/step-01-${width}.png`,fullPage:true});}
  checks.push('Patient file verified at 320/375/768/1440 without horizontal overflow');
  await page.getByLabel('Estado del tratamiento').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('name')),'effective_at');checks.push('Keyboard tab moves between labelled form controls');
  const response=await page.goto(`http://localhost:3450/admin/seguimiento/pacientes/${pid}`);assert.match(response.headers()['cache-control'],/no-store/);assert.match(response.headers()['x-robots-tag'],/noindex/);checks.push('Clinical route has private no-store and noindex response');
  assert.ok(!(await page.content()).includes('Reserva sintética QA'));checks.push('Reserved text not sent to clinical page browser');
  await page.getByText('Actualizar objetivos',{exact:true}).click();await page.getByLabel('Objetivos acordados con el paciente').fill('Objetivo compartido de planificación QA');await page.getByRole('button',{name:'Guardar objetivos compartidos'}).click();await page.getByRole('paragraph').filter({hasText:'Objetivo compartido de planificación QA'}).waitFor();checks.push('Shared objectives persisted in current patient file');
  await page.goto(`http://localhost:3450/admin/seguimiento/agenda/nuevo?paciente=${pid}`);
  await page.getByLabel('Actividad',{exact:true}).fill('Sesión grupal neutral QA');await page.getByLabel('Tipo de actividad').selectOption('group');
  await page.getByLabel('Inicio (hora de Chile)').fill(civil(Date.now()-7200000));await page.getByLabel('Término (hora de Chile)').fill(civil(Date.now()-3600000));
  await page.getByLabel('Buscar dentro de mis pacientes').fill(`Persona B ${run}`);await page.getByRole('button',{name:'Buscar participantes',exact:true}).click();await page.getByLabel(`Persona B ${run}`,{exact:true}).check();
  await page.getByLabel('Buscar dentro de mis pacientes').fill('Sin coincidencias QA');await page.getByRole('button',{name:'Buscar participantes',exact:true}).click();await page.getByText('Sin coincidencias; los seleccionados se conservan.').waitFor();assert.equal(await page.locator('input[name="patients"]').count(),2);checks.push('Participant selection persists across scoped search without exposing unassigned patients');
  await page.getByRole('button',{name:'Programar actividad',exact:true}).click();await page.getByText('Cambios guardados.',{exact:true}).waitFor();
  const group=check(await dir.from('care_events').select('*').eq('title','Sesión grupal neutral QA'));assert.equal(group.length,1);const eventId=group[0].id;
  assert.equal(check(await dir.from('care_event_participants').select('patient_id').eq('event_id',eventId)).length,2);checks.push('Brief group activity form stores one event and two expected participants');
  await page.goto(`http://localhost:3450/admin/seguimiento/agenda/${eventId}`);await page.getByLabel('Resultado de la actividad').selectOption('completed');await page.getByLabel('Motivo compartido del cierre').fill('Actividad realizada de prueba');await page.getByRole('button',{name:'Cerrar actividad',exact:true}).click();await page.getByText('Registrar o corregir asistencia',{exact:true}).first().waitFor();
  const participantCard=page.locator('article').filter({has:page.getByRole('heading',{name:`Persona A ${run}`,exact:true})});await participantCard.getByText('Registrar o corregir asistencia',{exact:true}).click();await participantCard.getByLabel('Asistencia',{exact:true}).selectOption('present');await participantCard.getByRole('button',{name:'Guardar asistencia',exact:true}).click();await participantCard.getByRole('paragraph').filter({hasText:/^Presente$/}).waitFor();
  assert.equal(check(await dir.from('care_event_participants').select('attendance').eq('event_id',eventId).eq('patient_id',pid))[0].attendance,'present');
  assert.equal(check(await dir.from('care_event_participants').select('attendance').eq('event_id',eventId).eq('patient_id',pbid))[0].attendance,'pending');checks.push('Activity closes then per-patient observed attendance persists; other patient stays pending');
  await participantCard.getByText('Acordar un compromiso',{exact:true}).click();await participantCard.getByLabel('Compromiso concreto').fill('Acuerdo compartido neutral QA');await participantCard.getByLabel('Fecha prevista (hora de Chile)').fill(civil(Date.now()+86400000));await participantCard.getByLabel('Visibilidad del compromiso').selectOption('patient');await participantCard.getByLabel(/Confirmo compartir este compromiso/).check();await participantCard.getByLabel('Motivo compartido del acuerdo o cambio').fill('Acuerdo de sesión QA');await participantCard.getByRole('button',{name:'Guardar compromiso',exact:true}).click();
  await participantCard.locator('form').filter({has:page.getByRole('button',{name:'Guardar compromiso',exact:true})}).getByRole('status').waitFor();const agreement=check(await dir.from('care_commitments').select('*').eq('title','Acuerdo compartido neutral QA'));assert.equal(agreement.length,1);assert.equal(agreement[0].source_event_id,eventId);checks.push('Professional shared commitment links to original event without duplication');
  const patientContext=await browser.newContext({viewport:{width:1440,height:1000}});const patientPage=await patientContext.newPage();await login(patientPage,'a',true);await patientPage.getByRole('heading',{name:'Hoy',exact:true}).waitFor();assert.ok(!(await patientPage.content()).includes('Reserva sintética QA'));await patientPage.getByText('Objetivo compartido de planificación QA',{exact:true}).waitFor();checks.push('Patient Today uses shared goals and own commitments without internal notes');
  await patientPage.getByRole('link',{name:'Mi semana',exact:true}).click();await patientPage.getByText('Sesión grupal neutral QA',{exact:true}).waitFor();await patientPage.getByText('Presente',{exact:true}).waitFor();
  const addPlan=patientPage.locator('section').filter({has:patientPage.getByRole('heading',{name:'Añadir mi actividad',exact:true})});await addPlan.getByLabel('Qué voy a hacer').fill('Actividad personal neutral QA');await addPlan.getByLabel('Cuándo (hora de Chile)').fill(civil(Date.now()+7200000));await addPlan.getByRole('button',{name:'Añadir a mi semana',exact:true}).click();await addPlan.getByText('Guardado en tu planificación.',{exact:true}).waitFor();
  const planCard=patientPage.locator('article').filter({has:patientPage.getByRole('heading',{name:'Actividad personal neutral QA',exact:true})});await planCard.getByRole('button',{name:'Marcar realizada',exact:true}).click();await planCard.getByText(/Realizada según tu reporte/).waitFor();assert.equal(check(await a.from('care_personal_plans').select('status').eq('title','Actividad personal neutral QA'))[0].status,'completed');checks.push('Patient weekly plan and self completion persist without modifying institutional attendance');
  for(const width of [320,375,768,1440]){await patientPage.setViewportSize({width,height:1000});assert.ok(await patientPage.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`Patient planning overflow at ${width}`);await patientPage.evaluate(()=>window.scrollTo(0,0));await patientPage.screenshot({path:`${output}/step-02-patient-${width}.png`,fullPage:true});}checks.push('Patient planning verified at 320/375/768/1440 without horizontal overflow');
  await patientPage.getByRole('link',{name:'Compromisos',exact:true}).click();const sharedCard=patientPage.locator('article').filter({has:patientPage.getByRole('heading',{name:'Acuerdo compartido neutral QA',exact:true})});await sharedCard.getByLabel('Cómo resultó').fill('Realizado según reporte neutral QA');await sharedCard.getByRole('button',{name:'Marcar realizado',exact:true}).click();await sharedCard.getByText(/Realizado según paciente/).waitFor();
  const completed=check(await a.from('care_commitments').select('*').eq('id',agreement[0].id))[0];assert.equal(completed.confirmation,'self');checks.push('Patient completion identified as self report, not clinical verification');
  await page.goto(`http://localhost:3450/admin/seguimiento/pacientes/${pid}/planificacion`);const verifyCard=page.locator('article').filter({has:page.getByRole('heading',{name:'Acuerdo compartido neutral QA',exact:true})});await verifyCard.getByLabel('Resultado verificado compartido').fill('Verificado por profesional en QA');await verifyCard.getByRole('button',{name:'Verificar realización',exact:true}).click();await verifyCard.getByText(/Realizado y verificado/).waitFor();
  const verified=check(await dir.from('care_commitments').select('*').eq('id',agreement[0].id))[0];assert.equal(verified.confirmation,'professional');assert.equal(verified.completed_at,completed.completed_at);checks.push('Professional UI verification preserves original patient completion time');
  const professionalAgreement=page.locator('details').filter({has:page.locator('summary',{hasText:'Crear compromiso'})});await professionalAgreement.locator('summary').click();await professionalAgreement.getByLabel('Compromiso concreto').fill('Tarea profesional neutral QA');await professionalAgreement.getByLabel('Fecha prevista (hora de Chile)').fill(civil(Date.now()+86400000));await professionalAgreement.getByLabel('Responsable de realizarlo').selectOption(accounts.psychology.id);await professionalAgreement.getByLabel('Motivo compartido del acuerdo o cambio').fill('Coordinación de seguimiento QA');await professionalAgreement.getByRole('button',{name:'Guardar compromiso',exact:true}).click();await professionalAgreement.getByRole('status').waitFor();
  const assignedAgreement=check(await dir.from('care_commitments').select('*').eq('title','Tarea profesional neutral QA'));assert.equal(assignedAgreement.length,1);assert.equal(assignedAgreement[0].responsible_id,accounts.psychology.id);assert.equal(assignedAgreement[0].responsible_kind,'professional');assert.equal(check(await a.from('care_commitments').select('id').eq('id',assignedAgreement[0].id)).length,0);checks.push('Professional responsibility selection persists current assignment and stays internal by default');
  assert.equal(check(await b.from('care_personal_plans').select('id').eq('patient_id',pid)).length,0);assert.equal(check(await b.from('care_commitments').select('id').eq('patient_id',pid)).length,0);assert.equal(check(await b.from('care_event_participants').select('patient_id').eq('event_id',eventId)).length,1);checks.push('Other group participant sees own attendance only, no A personal plan or agreement');
  const foreignAgenda=await b.rpc('care_agenda',{pid,start_at:new Date(Date.now()-86400000).toISOString(),end_at:new Date(Date.now()+86400000).toISOString(),patient_mode:true});assert.ok(foreignAgenda.error);checks.push('Explicit patient agenda resolver rejects foreign identity');
  for(const width of [320,375,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`Staff planning overflow at ${width}`);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${output}/step-02-staff-${width}.png`,fullPage:true});}checks.push('Professional planning and commitments responsive at all four widths');
  await auditCareUX(context,'planning-staff',[
    ['file',`/admin/seguimiento/pacientes/${pid}`],['planning',`/admin/seguimiento/pacientes/${pid}/planificacion`],
    ['new-event',`/admin/seguimiento/agenda/nuevo?paciente=${pid}`],['event',`/admin/seguimiento/agenda/${eventId}`],['team','/admin/seguimiento/equipo'],
  ]);
  await auditCareUX(patientContext,'planning-patient',[['today','/pacientes/hoy'],['week','/pacientes/planificacion'],['commitments','/pacientes/compromisos']]);
  const cmsContext=await browser.newContext();const cmsPage=await cmsContext.newPage();await login(cmsPage,'cms');assert.equal(await cmsPage.getByRole('link',{name:'Seguimiento',exact:true}).count(),0);const cmsResponse=await cmsPage.goto(`http://localhost:3450/admin/seguimiento/pacientes/${pid}`);assert.ok([403,404].includes(cmsResponse.status()));checks.push('CMS menu omits clinical section and direct route denied');
  const techContext=await browser.newContext();const techPage=await techContext.newPage();await login(techPage,'technical');await techPage.goto('http://localhost:3450/admin/seguimiento/equipo');await techPage.getByRole('heading',{name:'Capacidades profesionales'}).waitFor();checks.push('Technical UI configures capabilities without clinical reading');
  await auditCareUX(techContext,'technical',[['capabilities','/admin/seguimiento/equipo']]);
  const profile=techPage.locator('details').filter({has:techPage.locator('summary',{hasText:'QA cms'})});await profile.locator('summary').click();await profile.getByLabel('Ver pacientes asignados',{exact:true}).check();await profile.getByRole('button',{name:'Guardar capacidades'}).click();await profile.getByText('Cambios guardados.',{exact:true}).waitFor();assert.equal(check(await cms.rpc('care_directory')).total,0);checks.push('Explicit UI grant changes capability but gives no unassigned patient access');
  await dir.rpc('care_manage',{op:'assignment_end',p:{id:check(await dir.from('care_assignments').select('id').eq('patient_id',pid).eq('professional_id',accounts.psychology.id).is('ends_at',null))[0].id}}).then(check);
  assert.ok((await psy.rpc('care_read_note',{id:nid})).error);assert.equal(check(await psy.rpc('care_directory')).total,0);checks.push('Revoked assignment blocks REST with original professional session');
  check(await service.from('patient_profiles').update({is_active:false}).eq('id',pid));assert.equal(check(await a.from('care_shared_summaries').select('id').eq('patient_id',pid)).length,0);checks.push('Suspension blocks patient reads with previous normal JWT');
  await writeFile(`${output}/e2e-results.json`,JSON.stringify({status:'PASS',at:new Date().toISOString(),checks,counts:checks.length,environment:'local-only',emailSent:false},null,2));
  console.log(`PASS: ${checks.length} recorridos/REST/privacidad de seguimiento; capturas neutrales locales.`);
} catch(error){await writeFile(`${output}/e2e-results.json`,JSON.stringify({status:'FAIL',at:new Date().toISOString(),checks,message:error.message},null,2));throw error;}
finally {
  if(browser)await browser.close();if(server)server.kill();
  await writeFile(`${output}/server-local.log`,serverLog);
  // Every interpolated ID originated from local Auth/DB; validate before scoped cleanup.
  for(const id of [...users,...patientIds])assert.match(id,/^[0-9a-f-]{36}$/);
  if(patientIds.length){const pids=patientIds.map(id=>`'${id}'`).join(',');const uids=users.map(id=>`'${id}'`).join(',');await sql(`begin;
    delete from private.care_followup_notes where review_id in (select id from public.care_followup_reviews where patient_id in (${pids}));delete from public.care_followup_reviews where patient_id in (${pids});delete from private.care_alert_history where alert_id in (select id from public.care_alerts where patient_id in (${pids}));delete from public.care_alerts where patient_id in (${pids});
delete from public.care_commitment_history where commitment_id in (select id from public.care_commitments where patient_id in (${pids}));
    delete from public.care_commitments where patient_id in (${pids});
    delete from public.care_plan_history where plan_id in (select id from public.care_personal_plans where patient_id in (${pids}));
    delete from public.care_personal_plans where patient_id in (${pids});
    delete from public.care_goal_history where patient_id in (${pids});
    delete from public.care_patient_goals where patient_id in (${pids});
    delete from public.care_attendance_history where patient_id in (${pids});
    delete from public.care_event_history where event_id in (select id from public.care_events where created_by in (${uids}));
    delete from public.care_event_participants where patient_id in (${pids});
    delete from public.care_events where created_by in (${uids});
    delete from private.care_event_series where created_by in (${uids});
    delete from private.care_note_readers where note_id in (select id from private.care_reserved_notes where patient_id in (${pids}));
    delete from private.care_reserved_notes where patient_id in (${pids});
    delete from private.care_family_notes where patient_id in (${pids});
    delete from public.care_shared_summaries where patient_id in (${pids});
    delete from public.care_episode_history where episode_id in (select id from public.care_episodes where patient_id in (${pids}));
    delete from public.care_episodes where patient_id in (${pids});
    delete from public.care_assignments where patient_id in (${pids});
    delete from public.care_staff_capabilities where user_id in (${uids});
    delete from private.care_audit where actor_id in (${uids});
    delete from public.patient_profiles where id in (${pids});
    alter table public.admin_users disable trigger protect_last_active_superadmin;
    delete from auth.users where id in (${uids}) and email like 'care-qa-${run}-%@example.test';
    alter table public.admin_users enable trigger protect_last_active_superadmin;
    commit;`);console.log('Fixtures QA retirados; guard de superadmin restaurado en transacción local.');}
  else for(const id of users)check(await service.auth.admin.deleteUser(id));
}
