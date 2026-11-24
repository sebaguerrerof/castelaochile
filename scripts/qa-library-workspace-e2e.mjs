import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {officeFixture,pdfFixture} from '../tests/helpers/library-fixtures.ts';

assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54421');
assert.equal(process.env.NEXT_PUBLIC_SITE_URL,'http://localhost:3450');
assert.equal(process.env.PATIENT_AUTH_EMAILS_ENABLED,'false');
const base='http://localhost:3450',out='tmp/care-qa/library-workspace',run=randomUUID().slice(0,8),password='Aa1!'+randomBytes(20).toString('hex');
const require=createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Git/castelaochile/tmp/playwright-mobile';
const {chromium,webkit}=require(require.resolve('playwright',{paths:['C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const users=[],patients=[randomUUID(),randomUUID()],checks=[],responsive=[],pageErrors=[];
let server,browser,failure,serverLog='';
await mkdir(out,{recursive:true});
await writeFile(out+'/results.json',JSON.stringify({status:'RUNNING',run,at:new Date().toISOString()}));
const unwrap=r=>{if(r.error)throw Error(r.error.message);return r.data;};
function pass(label){checks.push(label);console.log('PASS '+label);}
async function sql(input){return new Promise((resolve,reject)=>{
  const p=spawn('C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe',['exec','-i','supabase_db_castelao-patient-qa','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-t','-A'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';p.stdout.on('data',d=>stdout+=d);p.stderr.on('data',d=>stderr+=d);p.stdin.end(input);p.on('error',reject);p.on('close',code=>code?reject(Error(stderr)):resolve(stdout.trim()));
});}
async function login(context,index,patient=false){
  const p=await context.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>pageErrors.push(e.message));
  await p.goto(base+(patient?'/pacientes/login':'/admin/login'));
  await p.getByLabel(patient?'Correo electrónico':'Correo institucional',{exact:true}).fill(users[index].email);
  await p.getByLabel('Contraseña',{exact:true}).fill(password);
  await p.getByRole('button',{name:patient?'Entrar a mi espacio':'Ingresar',exact:true}).click();
  await p.waitForURL(base+(patient?'/pacientes':'/admin'));return p;
}
async function screen(p,width,engine,label,modal=false){
  await p.setViewportSize({width,height:width===320?620:900});
  await p.locator('.admin-page-header h1, .library-detail h1').first().waitFor();
  await p.locator('.admin-skeleton').first().waitFor({state:'hidden'});
  await p.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
  const result=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll('h1').length,error:/Application error|Something went wrong/.test(document.body.innerText)}));
  assert.equal(result.overflow,false,`${engine} ${label} ${width} overflow`);assert.equal(result.h1,1);assert.equal(result.error,false);
  if(modal){const box=await p.getByRole('dialog',{name:'Nuevo material',exact:true}).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=(width===320?620:900)+1);}
  await p.screenshot({path:`${out}/${engine}-${label}-${width}.png`,fullPage:!modal});responsive.push({engine,label,width,status:'PASS'});
}
async function fillMaterial(p,title,{file,body='',publish=true}={}){
  await p.getByRole('button',{name:'Nuevo material',exact:true}).click();
  const modal=p.getByRole('dialog',{name:'Nuevo material',exact:true});
  await modal.getByLabel('Título',{exact:true}).fill(title);
  await modal.getByLabel('Audiencia',{exact:true}).selectOption('patients');
  await modal.getByRole('checkbox',{name:'Paciente A interfaz QA',exact:true}).check();
  if(body)await modal.locator('[contenteditable=true]').fill(body);
  if(file)await modal.getByLabel('Archivo opcional',{exact:true}).setInputFiles(file);
  await modal.getByLabel('Estado',{exact:true}).selectOption(publish?'published':'draft');
  if(publish)await modal.getByRole('checkbox',{name:'He revisado el contenido y la audiencia efectiva para publicar',exact:true}).check();
  return modal;
}
async function material(title){return unwrap(await service.from('patient_library_materials').select('*').eq('title',title).single());}
async function readyAttachments(id){return unwrap(await service.from('patient_library_attachments').select('*').eq('material_id',id).eq('state','ready'));}
async function apiUpload(p,mid,name,bytes){
  const version=(await service.from('patient_library_materials').select('version').eq('id',mid).single()).data.version;
  const begun=await p.request.post(base+'/api/pacientes/adjuntos',{headers:{Origin:base},data:{material_id:mid,version,replaces_id:'',name,size:bytes.length}});assert.equal(begun.status(),200);const signed=await begun.json();
  const upload=await service.storage.from('patient-library').uploadToSignedUrl(signed.path,signed.token,bytes,{contentType:signed.mime});unwrap(upload);
  const end=await p.request.post(base+`/api/pacientes/adjuntos/${signed.id}/finalizar`,{headers:{Origin:base}});assert.equal(end.status(),200);return signed.id;
}
try{
  assert.equal(await sql("select count(*)from cron.job where jobname='castelao-care-tick'and active;"),'0');
  for(let i=0;i<4;i++){const email=`library-ui-qa-${run}-${i}@example.test`;users.push({...unwrap(await service.auth.admin.createUser({email,password,email_confirm:true})).user,email});}
  await sql(`insert into public.admin_users(user_id,role,is_active)values('${users[0].id}','superadmin',true),('${users[3].id}','psychologist',true);
    insert into public.patient_profiles(id,auth_user_id,email,display_name)values('${patients[0]}','${users[1].id}','${users[1].email}','Paciente A interfaz QA'),('${patients[1]}','${users[2].id}','${users[2].email}','Paciente B interfaz QA');
    insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by)values('${patients[0]}','${users[3].id}','psychology',now()-interval '1 day','${users[0].id}');`);
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3450'],{windowsHide:true,env:process.env,stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
  for(let i=0;i<60;i++){try{if((await fetch(base+'/admin/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
  for(const [engine,launcher]of[['chromium',chromium],['webkit',webkit]]){
    browser=await launcher.launch(engine==='chromium'?{headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{headless:true});
    const dc=await browser.newContext(),ac=await browser.newContext(),bc=await browser.newContext(),pc=await browser.newContext();
    const d=await login(dc,0),a=await login(ac,1,true),b=await login(bc,2,true),professional=await login(pc,3);
    // Exercise navigation, not just its CSS: search destination, keyboard and mobile drawer.
    await d.keyboard.press('Control+k');const search=d.getByRole('dialog',{name:'Ir a una sección',exact:true});await search.waitFor();
    await search.getByLabel('Nombre de la sección').fill('biblioteca');
    await search.getByRole('link',{name:'Biblioteca',exact:true}).click();await d.waitForURL(base+'/admin/biblioteca');
    assert.equal(await d.locator('.admin-topbar').count(),1);pass(`${engine}: topbar search navigates to authorized section with Ctrl K`);
    await d.getByRole('button',{name:'Buscar sección',exact:true}).click();await search.getByLabel('Nombre de la sección').fill('sin coincidencia');await search.getByText('Sin coincidencias',{exact:true}).waitFor();await d.keyboard.press('Escape');await search.waitFor({state:'hidden'});assert.equal(await d.getByRole('button',{name:'Buscar sección'}).evaluate(e=>e===document.activeElement),true);pass(`${engine}: search empty state and Escape return focus`);
    await professional.getByRole('button',{name:'Buscar sección'}).click();const ps=professional.getByRole('dialog',{name:'Ir a una sección'});assert.equal(await ps.getByRole('link',{name:'Equipo y usuarios',exact:true}).count(),0);assert.equal(await ps.getByRole('link',{name:'Contenidos',exact:true}).count(),0);await professional.keyboard.press('Escape');pass(`${engine}: professional navigation retains role restrictions`);
    for(const width of[320,375,768,1440]){
      for(const [route,label]of[['/admin','home'],['/admin/pacientes','patients'],['/admin/contenidos','content'],['/admin/biblioteca','library'],['/admin/seguimiento','dashboard'],['/admin/grupos-terapeuticos','groups']]){await d.goto(base+route);await screen(d,width,engine,label);}
      await d.goto(base+'/admin/biblioteca?q=QA');const before=d.url();await d.getByRole('button',{name:'Nuevo material',exact:true}).click();const modal=d.getByRole('dialog',{name:'Nuevo material',exact:true});await screen(d,width,engine,'library-modal',true);assert.equal(d.url(),before);
      for(let tab=0;tab<24;tab++){await d.keyboard.press('Tab');assert.equal(await modal.evaluate(e=>e.contains(document.activeElement)),true);}
      await d.keyboard.press('Escape');await modal.waitFor({state:'hidden'});
      if(width<1024){await d.getByRole('button',{name:'Abrir navegación',exact:true}).click();const menu=d.getByRole('dialog',{name:'Navegación administrativa'});await menu.waitFor();for(let tab=0;tab<22;tab++){await d.keyboard.press('Tab');assert.equal(await menu.evaluate(e=>e.contains(document.activeElement)),true);}await d.keyboard.press('Escape');await menu.waitFor({state:'hidden'});}
      pass(`${engine}: ${width}px shell, tables, creation modal and navigation focus`);
    }
    await d.goto(base+'/admin/biblioteca');await d.setViewportSize({width:1440,height:900});
    await d.getByRole('button',{name:'Contraer barra lateral',exact:true}).click();await d.waitForFunction(()=>document.querySelector('.admin-shell')?.getAttribute('data-collapsed')==='true');await d.reload();await d.waitForFunction(()=>document.querySelector('.admin-shell')?.getAttribute('data-collapsed')==='true');await d.getByRole('button',{name:'Expandir barra lateral',exact:true}).click();pass(`${engine}: sidebar collapse persists and expands`);
    const prefix=`QA biblioteca ${run} ${engine}`;
    let modal=await fillMaterial(d,prefix+' texto',{body:'Material publicado sin archivo QA.'});
    await d.keyboard.press('Escape');await modal.getByText('Tienes cambios sin guardar.',{exact:true}).waitFor();await modal.getByRole('button',{name:'Seguir editando',exact:true}).click();assert.equal(await modal.getByLabel('Título',{exact:true}).inputValue(),prefix+' texto');
    await modal.getByRole('button',{name:'Guardar material',exact:true}).click();await modal.waitFor({state:'hidden'});assert.equal(d.url(),base+'/admin/biblioteca');const text=await material(prefix+' texto');assert.equal(text.status,'published');assert.equal((await readyAttachments(text.id)).length,0);await a.goto(base+`/pacientes/materiales/${text.id}`);await a.getByText('Material publicado sin archivo QA.',{exact:true}).waitFor();pass(`${engine}: optional file, dirty guard and actual patient text publication`);
    const pdfFile={name:'lectura.pdf',mimeType:'application/pdf',buffer:pdfFixture()};
    modal=await fillMaterial(d,prefix+' PDF',{file:pdfFile});assert.equal(await modal.getByLabel('Título',{exact:true}).inputValue(),prefix+' PDF');
    let release;const gate=new Promise(r=>release=r);
    await d.route('**/api/pacientes/adjuntos/*/finalizar',async route=>{try{assert.equal((await material(prefix+' PDF')).status,'draft');const aid=new URL(route.request().url()).pathname.split('/').at(-2);assert.equal((await b.request.get(base+`/api/pacientes/archivos/${aid}?vista=1`)).status(),404);assert.equal((await a.request.get(base+`/api/pacientes/archivos/${aid}?vista=1`)).status(),404);release();await route.continue();}catch(error){release(error);await route.abort();}});
    await modal.getByRole('button',{name:'Guardar material',exact:true}).click();const gateError=await Promise.race([gate,new Promise(r=>setTimeout(()=>r(Error('Upload did not reach validation')),30000))]);if(gateError)throw gateError;await modal.waitFor({state:'hidden'});await d.unroute('**/api/pacientes/adjuntos/*/finalizar');const pdf=await material(prefix+' PDF'),[attachment]=await readyAttachments(pdf.id);assert.equal(pdf.status,'published');assert.ok(attachment);pass(`${engine}: real signed upload validates before publishing file-only material`);
    await a.goto(base+`/pacientes/materiales/${pdf.id}`);const reader=a.getByRole('region',{name:'Lectura de lectura.pdf',exact:true});const patientURL=a.url();await a.getByRole('button',{name:'Leer aquí',exact:true}).click();await reader.getByText('Página 1 de 1',{exact:true}).waitFor();await reader.locator('summary').click();await reader.getByText('Lectura PDF privada QA',{exact:false}).waitFor();assert.ok(await reader.locator('canvas').evaluate(e=>e.width>100&&e.height>100));assert.equal(a.url(),patientURL);assert.equal(ac.pages().length,1);
    for(const width of[320,375,768,1440])await screen(a,width,engine,'patient-pdf');await reader.getByRole('button',{name:'Cerrar lectura',exact:true}).click();pass(`${engine}: PDF renders in application, text accessible and no new tab`);
    const deny=await b.request.get(base+`/api/pacientes/archivos/${attachment.id}?lectura=1`);assert.equal(deny.status(),404);assert.match(deny.headers()['cache-control'],/no-store/);assert.equal((await a.request.get(base+`/api/pacientes/adjuntos/${attachment.id}`)).status(),404);assert.equal((await d.request.delete(base+`/api/pacientes/adjuntos/${attachment.id}`,{headers:{Origin:base},data:{version:pdf.version}})).status(),404);pass(`${engine}: patient scope, private cache and ready-attachment deletion denial`);
    modal=await fillMaterial(d,prefix+' Word',{file:{name:'lectura.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:officeFixture('docx')}});await modal.getByRole('button',{name:'Guardar material',exact:true}).click();await modal.waitFor({state:'hidden'});const word=await material(prefix+' Word');
    const ids={docx:(await readyAttachments(word.id))[0].id};ids.doc=await apiUpload(d,word.id,'legacy.doc',await readFile('tmp/library-modal-qa/legacy-word.doc'));ids.xlsx=await apiUpload(d,word.id,'valores.xlsx',officeFixture('xlsx'));ids.pptx=await apiUpload(d,word.id,'diapositivas.pptx',officeFixture('pptx'));ids.png=await apiUpload(d,word.id,'imagen.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM2kAAAAASUVORK5CYII=','base64'));
    await a.goto(base+`/pacientes/materiales/${word.id}`);const wordURL=a.url();for(const [name,expected]of[['lectura.docx','Lectura privada de Word QA'],['legacy.doc',null],['valores.xlsx','Lectura Excel QA'],['diapositivas.pptx','Lectura PowerPoint QA']]){
      const file=a.locator('.library-file').filter({has:a.getByRole('heading',{name,exact:true})});await file.getByRole('button',{name:'Leer aquí',exact:true}).click();await file.locator('.library-reader-document').waitFor();if(expected)await file.getByText(expected,{exact:false}).waitFor();assert.ok((await file.locator('.library-reader-document').textContent()).trim().length>0);assert.equal(await file.locator('.library-reader-document script').count(),0);assert.equal(a.url(),wordURL);await file.getByRole('region',{name:`Lectura de ${name}`,exact:true}).getByRole('button',{name:'Cerrar lectura',exact:true}).click();
    }pass(`${engine}: DOC, DOCX, XLSX and PPTX read privately, escaped and in-page`);
    const image=a.locator('.library-file').filter({has:a.getByRole('heading',{name:'imagen.png',exact:true})});await image.getByRole('button',{name:'Leer aquí',exact:true}).click();await image.locator('.library-reader img').waitFor();await a.waitForFunction(()=>document.querySelector('.library-reader img')?.naturalWidth===1);await image.getByRole('region',{name:'Lectura de imagen.png'}).getByRole('button',{name:'Cerrar lectura',exact:true}).click();pass(`${engine}: image is read through a private blob in the application`);
    if(engine==='chromium'){
      modal=await fillMaterial(d,prefix+' retry',{file:{name:'fallido.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from('invalid office document')}});await modal.getByRole('button',{name:'Guardar material',exact:true}).click();await modal.getByRole('alert').waitFor();const draft=await material(prefix+' retry');assert.equal(draft.status,'draft');assert.equal(await modal.getByLabel('Título',{exact:true}).inputValue(),prefix+' retry');
      const failed=unwrap(await service.from('patient_library_attachments').select('*').eq('material_id',draft.id).eq('state','failed').single());
      assert.equal((await d.request.delete(base+`/api/pacientes/adjuntos/${failed.id}`,{headers:{Origin:'https://wrong.example'},data:{version:draft.version}})).status(),404);
      await modal.getByLabel('Archivo opcional',{exact:true}).setInputFiles(pdfFile);await modal.getByRole('button',{name:'Guardar material',exact:true}).click();await modal.waitFor({state:'hidden'});assert.equal((await material(prefix+' retry')).id,draft.id);assert.equal((await material(prefix+' retry')).status,'published');assert.equal((await readyAttachments(draft.id)).length,1);assert.equal(unwrap(await service.from('patient_library_attachments').select('state').eq('id',failed.id).single()).state,'retired');pass('failed upload retry preserves one draft, retires incomplete attempt and publishes valid replacement');
      await sql(`update public.patient_profiles set is_active=false where id='${patients[0]}';`);assert.equal((await a.request.get(base+`/api/pacientes/archivos/${attachment.id}?vista=1`)).status(),404);assert.equal((await a.request.get(base+`/api/pacientes/archivos/${ids.docx}?lectura=1`)).status(),404);await sql(`update public.patient_profiles set is_active=true where id='${patients[0]}';`);pass('suspension revokes PDF and Office access with existing session');
    }
    await d.emulateMedia({reducedMotion:'reduce'});await d.goto(base+'/admin');await d.waitForFunction(()=>{const header=document.querySelector('.admin-page-header');return matchMedia('(prefers-reduced-motion: reduce)').matches&&header&&getComputedStyle(header).animationName==='none';});assert.equal(await d.locator('.admin-page-header').evaluate(e=>getComputedStyle(e).animationName),'none');pass(`${engine}: reduced-motion preference respected`);
    await dc.close();await ac.close();await bc.close();await pc.close();await browser.close();browser=null;
  }
  assert.deepEqual(pageErrors,[]);pass('no browser application errors');
}catch(error){failure=error;console.error(error.stack);if(browser){const pages=browser.contexts().flatMap(c=>c.pages());const staff=pages.find(p=>p.url().includes('/admin/biblioteca'));if(staff){await staff.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure-labels.json',JSON.stringify(await staff.locator('dialog[open] label').allTextContents(),null,2));}}}
finally{
  await browser?.close();server?.kill();let cleaned=false;
  try{
    const actor=users[0]?.id;if(actor){const materials=unwrap(await service.from('patient_library_materials').select('id').eq('author_id',actor));const mids=materials.map(m=>m.id);if(mids.length){const attachments=unwrap(await service.from('patient_library_attachments').select('object_key').in('material_id',mids));if(attachments.length)unwrap(await service.storage.from('patient-library').remove(attachments.map(a=>a.object_key)));await sql(`update public.patient_library_attachments set replaces_id=null where material_id in(${mids.map(id=>`'${id}'`).join(',')});delete from public.patient_library_attachments where material_id in(${mids.map(id=>`'${id}'`).join(',')});delete from public.patient_library_materials where author_id='${actor}';`);}}
    const ids=users.map(u=>`'${u.id}'`).join(',')||'null';await sql(`begin;delete from public.patient_library_audit where actor_id in(${ids});delete from public.admin_audit_log where actor_id in(${ids});delete from private.care_audit where actor_id in(${ids});delete from public.care_assignments where professional_id in(${ids});delete from public.patient_profiles where id in('${patients[0]}','${patients[1]}');delete from public.care_staff_capabilities where user_id in(${ids});alter table public.admin_users disable trigger protect_last_active_superadmin;delete from auth.users where id in(${ids});alter table public.admin_users enable trigger protect_last_active_superadmin;commit;`);
    assert.equal(await sql(`select count(*)from auth.users where email like 'library-ui-qa-${run}-%@example.test';`),'0');assert.equal(await sql("select tgenabled from pg_trigger where tgname='protect_last_active_superadmin'and tgrelid='public.admin_users'::regclass;"),'O');assert.equal(await sql("select public from storage.buckets where id='patient-library';"),'f');cleaned=true;pass('owned fixtures and storage removed, bucket private and protections enabled');
  }catch(error){failure??=error;console.error('Cleanup: '+error.message);}
  await writeFile(out+'/results.json',JSON.stringify({status:failure?'FAIL':'PASS',at:new Date().toISOString(),checks,responsive,pageErrors,failure:failure?.message,cleaned,physicalDevices:false},null,2));await writeFile(out+'/server.log',serverLog);
}
if(failure)process.exitCode=1;else console.log(`Library/workspace: ${checks.length} functional + ${responsive.length} responsive PASS`);
