import assert from 'node:assert/strict';

import { spawn } from 'node:child_process';

import { readFile, writeFile, mkdir } from 'node:fs/promises';

import { existsSync } from 'node:fs';

import path from 'node:path';

import { fileURLToPath } from 'node:url';

import { createHash } from 'node:crypto';
import { coreMobileGroups, extendedMobileGroups, coreMobileSuites, extendedMobileSuites } from './care-mobile-coverage.mjs';



const root=fileURLToPath(new URL('../',import.meta.url));

const workspace=path.join(root,'tmp','patient-supabase-local');

const output=path.join(root,'tmp','care-qa');

const cli=path.join(root,'node_modules','supabase','dist','supabase.js');

const project='castelao-patient-qa';

const dockerCandidates=[path.join(process.env.LOCALAPPDATA??'','Programs','DockerDesktop','resources','bin','docker.exe'),'C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe','C:/Program Files/Docker/Docker/resources/bin/docker.exe'];

const docker=process.platform==='win32' ? dockerCandidates.find(existsSync)??'docker' : 'docker';

async function run(file,args,{input,env,capture=false}={}) {

  return new Promise((resolve,reject)=>{

    const child=spawn(file,args,{cwd:root,windowsHide:true,env:env??process.env,stdio:[input?'pipe':'ignore',capture?'pipe':'inherit',capture?'pipe':'inherit']});

    let stdout='';let stderr='';

    if(capture){child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);}

    if(input) child.stdin.end(input);

    child.on('error',reject);

    child.on('close',code=>code===0?resolve(stdout):reject(new Error(file===docker?stderr:'El comando local falló; comprueba el stack QA.')));

  });

}

async function owned() {

  const marker=JSON.parse(await readFile(path.join(workspace,'patient-qa.json'),'utf8'));

  assert.equal(marker.project,project);

  assert.match(await readFile(path.join(workspace,'supabase','config.toml'),'utf8'),/^project_id = "castelao-patient-qa"$/m);

  await mkdir(output,{recursive:true});

}

async function sql(input) {return run(docker,['exec','-i',`supabase_db_${project}`,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-P','pager=off'],{input,capture:true});}

async function localEnv() {

  const status=JSON.parse(await run(process.execPath,[cli,'status','--workdir',workspace,'--output','json'],{capture:true}));

  assert.equal(new URL(status.API_URL).origin,'http://127.0.0.1:54421');

  const key=status.PUBLISHABLE_KEY??status.ANON_KEY;const secret=status.SECRET_KEY??status.SERVICE_ROLE_KEY;

  assert.ok(key&&secret);

  return {...process.env,NEXT_PUBLIC_SUPABASE_URL:status.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key,SUPABASE_SECRET_KEY:secret,

    NEXT_PUBLIC_SITE_URL:'http://localhost:3450',NEXT_DIST_DIR:'.next-care',CARE_LOCAL_QA:'true',NODE_OPTIONS:process.env.NODE_OPTIONS||'--max-old-space-size=1536',CARE_PORTAL_ENABLED:'true',PATIENT_PORTAL_ENABLED:'true',

    PATIENT_AUTH_EMAILS_ENABLED:'false',ANALYTICS_ENABLED:'false',CONTACT_INTAKE_ENABLED:'false',UPSTASH_REDIS_REST_URL:'',UPSTASH_REDIS_REST_TOKEN:''};

}

try {

  await owned();

  const action=process.argv[2];
  if(existsSync(path.join(output,'20261010122821_care_jobs_rules.sql.json'))&&['refresh-inform-functions','refresh-dashboard-functions'].includes(action))throw new Error('Paso 10 extiende estas funciones; usar refresh-jobs-functions para conservar alcance y reglas.');

  if(action==='apply') {

    // Only a checked-in care migration, only the marked local container. No db push/reset/link.

    const filename=process.argv[3];assert.match(filename??'',/^\d{14}_care_[a-z_]+\.sql$/);

    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');

    const hash=createHash('sha256').update(input).digest('hex');

    const record=path.join(output,filename+'.json');

    if(existsSync(record)) {assert.equal(JSON.parse(await readFile(record,'utf8')).hash,hash,'La migración local cambió; preparar revisión explícita antes de reaplicarla.');console.log('Migración ya comprobada en QA local.');}

    else {await sql(input);await writeFile(record,JSON.stringify({filename,hash,appliedAt:new Date().toISOString(),environment:project},null,2));console.log(`PASS: ${filename} aplicada solo al contenedor QA local.`);}

  } else if(action==='refresh-foundation-functions') {

    // Development iteration only: no table drops or data loss. Checked scope is fixed.

    const filename='20261009172648_care_foundation.sql';

    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');

    const definitions=[...input.matchAll(/create function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));

    assert.equal(definitions.length,16);

    const policies=[...input.matchAll(/create policy (care_\w+) on (public\.care_\w+)[\s\S]*?;/g)];

    assert.equal(policies.length,6);

    const grants=input.slice(input.indexOf('-- Each function is denied by default'));

    await sql('begin;\n'+definitions.join('\n')+'\n'+policies.map(p=>`drop policy if exists ${p[1]} on ${p[2]};\n${p[0]}`).join('\n')+'\n'+grants);

    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));

    console.log('Funciones/políticas foundation actualizadas solo en QA local; tablas e historial conservados.');

  } else if(action==='refresh-planning-functions') {

    const filename='20261009175355_care_planning.sql';

    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');

    const definitions=[...input.matchAll(/create function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));

    assert.equal(definitions.length,9);

    const grants=input.slice(input.indexOf('revoke all on function'));

    await sql('begin;\n'+definitions.join('\n')+'\n'+grants);

    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));

    console.log('Funciones planning actualizadas solo en QA local; historial conservado.');

  } else if(action==='refresh-report-functions') {

    const filename='20261009184332_care_daily_reports.sql';

    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');

    const definitions=[...input.matchAll(/create function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));

    assert.equal(definitions.length,11);

    // Local development upgrade from the first draft; no data/history drops.

    await sql('begin;\nalter table public.care_report_rules add column if not exists revision bigint generated always as identity unique;\nalter table public.care_report_exemptions add column if not exists revision bigint generated always as identity unique;\ndrop index public.care_report_rule_effective;\ncreate index care_report_rule_effective on public.care_report_rules(kind,effective_on desc,revision desc);\n'+definitions.join('\n')+'\n'+input.slice(input.indexOf('-- Explicit function permissions')));

    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));

    console.log('Funciones de reportes actualizadas solo en QA local; datos conservados.');

  } else if(action==='refresh-record-functions') {

    const filename='20261009211311_care_professional_records.sql';

    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');

    const definitions=[...input.matchAll(/create function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));

    assert.equal(definitions.length,14);

    await sql('begin;\n'+definitions.join('\n')+'\n'+input.slice(input.indexOf('revoke all on function')));

    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));

    console.log('Funciones de registros actualizadas solo en QA local; contenido/historia conservados.');

  } else if(action==='refresh-dashboard-functions') {

    const filename='20261009220656_care_dashboard.sql';

    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');

    const definitions=[...input.matchAll(/create function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));

    assert.equal(definitions.length,18);

    await sql('begin;\nalter table private.care_followup_notes add column if not exists record_revision integer not null check(record_revision>0);\n'+definitions.join('\n')+'\n'+input.slice(input.indexOf('revoke all on function')));

    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));

    console.log('Funciones dashboard actualizadas solo en QA local; historia conservada.');

  } else if(action==='refresh-metrics-functions') {

    const filename='20261009233412_care_metrics.sql';

    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');

    const definitions=[...input.matchAll(/create function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));

    assert.equal(definitions.length,9);

    await sql('begin;\n'+definitions.join('\n')+'\n'+input.slice(input.indexOf('revoke all on function')));

    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));

    console.log('Funciones métricas actualizadas solo en QA local; datos conservados.');

  } else if(action==='refresh-recovery-family-functions') {
    const filename='20261010000320_care_recovery_family.sql';
    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');
    const definitions=[...input.matchAll(/create function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));
    assert.equal(definitions.length,15);
    await sql('alter table private.care_autonomy_drafts add column if not exists occurred_at timestamptz not null default now(); alter table private.care_family_drafts add column if not exists occurred_at timestamptz not null default now(); alter table private.care_autonomy_drafts alter column occurred_at drop default; alter table private.care_family_drafts alter column occurred_at drop default;');
    await sql('begin;\n'+definitions.join('\n')+'\n'+input.slice(input.indexOf('revoke all on function')));
    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));
    console.log('Funciones Recovery/familia actualizadas solo en QA local; historia conservada.');
  } else if(action==='refresh-decision-functions') {
    const filename='20261010005911_care_decisions_supervision.sql';
    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');
    const definitions=[...input.matchAll(/create function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));
    assert.equal(definitions.length,16);
    await sql('begin;\n'+definitions.join('\n')+'\n'+input.slice(input.indexOf('revoke all on function')));
    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));
    console.log('Funciones decisiones/supervisión actualizadas solo en QA local; historial conservado.');
  } else if(action==='refresh-inform-functions') {
    const filename='20261010013747_care_period_informs.sql';
    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');
    const definitions=[...input.matchAll(/create function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));
    assert.equal(definitions.length,15);
    await sql('begin;\n'+definitions.join('\n')+'\n'+input.slice(input.lastIndexOf('revoke all on function private.care_inform_user_allowed')));
    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));
    console.log('Funciones de informes actualizadas solo en QA local; versiones conservadas.');
  } else if(action==='refresh-jobs-functions') {
    const filename='20261010122821_care_jobs_rules.sql';const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');
    const definitions=[...input.matchAll(/create (?:or replace )?function (?:private|public)\.care_[\s\S]*?\$\$;/g)].map(m=>m[0].replace(/^create (?:or replace )?function/,'create or replace function'));
    assert.equal(definitions.length,22);
    await sql('begin;\ndrop function if exists private.care_job_view(integer,boolean);\n'+definitions.join('\n')+'\nrevoke all on function private.care_operational_sync(uuid[]) from public,anon,authenticated,service_role;\n'+input.slice(input.indexOf('-- Explicit deny-by-default')));
    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));
    console.log('Funciones jobs actualizadas solo en QA local; historia conservada.');
  } else if(['scheduler-on','scheduler-off','scheduler-status'].includes(action)) {
    // Fixed SQL, owner role and marked QA database only. No HTTP endpoint or secrets.
    const probe=await sql("select count(*) from cron.job where jobname='castelao-care-tick' and (username<>'postgres' or command<>'select private.care_scheduler_tick();');");
    assert.match(probe,/\b0\b/,'El nombre de cron pertenece a otra operación; no modificar.');
    if(action==='scheduler-on') {
      const schedule=process.argv[3]==='--qa-fast'?'10 seconds':'* * * * *';
      await sql(`select cron.schedule('castelao-care-tick','${schedule}','select private.care_scheduler_tick();');`);
      await writeFile(path.join(output,'scheduler-owned.json'),JSON.stringify({project,jobname:'castelao-care-tick',schedule,timezone:'America/Santiago (SQL gate; cron GMT)',at:new Date().toISOString()},null,2));
      console.log('Scheduler privado activado solo en QA local; verificar cron.job_run_details, no asumir ejecución por configuración.');
    } else if(action==='scheduler-off') {
      await sql("select cron.unschedule(jobid) from cron.job where jobname='castelao-care-tick' and username='postgres' and command='select private.care_scheduler_tick();';");
      console.log('Scheduler propio retirado del QA local; ejecuciones e historia conservadas.');
    } else console.log(await sql("select jobname,schedule,username,active from cron.job where jobname='castelao-care-tick'; select last_started_at,last_finished_at,last_cron_at,ticks from private.care_scheduler_state;"));
  } else if(action==='db-test') {
    if(existsSync(path.join(output,'20261010122821_care_jobs_rules.sql.json')))assert.match(await sql("select count(*) from cron.job where jobname='castelao-care-tick' and active;"),/\b0\b/,'Detener scheduler QA antes de pruebas con fixtures: scheduler-off.');

    let assertions=0;

    for(const filename of ['care_rls_test.sql','care_planning_test.sql','care_reports_test.sql','care_records_test.sql','care_recovery_activity_test.sql','care_recovery_weekly_test.sql','care_recovery_supervision_test.sql','care_recovery_monthly_test.sql','care_recovery_coordination_test.sql','care_dashboard_test.sql','care_metrics_test.sql','care_recovery_family_test.sql','care_decisions_test.sql','care_informs_test.sql','care_jobs_test.sql','care_director_roles_test.sql']) {

      if(!existsSync(path.join(root,'supabase','tests',filename)))continue;

      const input=await readFile(path.join(root,'supabase','tests',filename),'utf8');

      const result=await sql(input);assert.match(result,/ROLLBACK/);

      assertions+=[...input.matchAll(/^select pg_temp\.care_(assert|denied)\(/gm)].length;

    }

    await writeFile(path.join(output,'db-results.json'),JSON.stringify({status:'PASS',assertions,rolledBack:true,environment:project,at:new Date().toISOString()},null,2));

    console.log(`PASS: ${assertions} comprobaciones de atención en PostgreSQL real, rol authenticated; rollback completo.`);

  } else if(['release-db','release-web'].includes(action)) {
    await run(process.execPath,[path.join(root,'scripts',action==='release-db'?'qa-care-release-db.mjs':'qa-care-release-web.mjs')],{env:await localEnv()});
  } else if(action==='ux-report') {
    const groups=['planning-staff','planning-patient','technical','reports-staff','reports-patient','records-psychology','records-recovery','records-psychiatry','records-direction','records-patient','dashboard-direction','dashboard-empty','metrics-direction','metrics-empty','recovery-family-staff','recovery-family-direction','recovery-family-patient','recovery-family-empty','decisions-empty','decisions-direction','decisions-staff','informs-empty','informs-direction','informs-regenerated','informs-monthly','informs-professional','jobs-empty','jobs-configured','jobs-failed','jobs-completed','jobs-comparison','jobs-periods','jobs-team'];
    const reports=await Promise.all(groups.map(async group=>JSON.parse(await readFile(path.join(output,'ux',group+'.json'),'utf8'))));
    const results=reports.flatMap(r=>r.results.map(result=>({group:r.group,...result})));
    const failures=results.filter(r=>r.status==='FAIL');
    await writeFile(path.join(output,'ux','results.json'),JSON.stringify({status:failures.length?'FAIL':'PASS',at:new Date().toISOString(),groups:groups.length,screens:results.length,findings:failures.reduce((n,r)=>n+r.findings.length,0),results},null,2));
    assert.equal(failures.length,0);console.log(`PASS UX: ${results.length} controles; ${groups.length} contextos. Suites existentes verificadas individualmente.`);
  } else if(['mobile-audit','mobile-extended-audit','mobile-report','mobile-extended-report'].includes(action)) {
    assert.match(await sql("select count(*) from cron.job where jobname='castelao-care-tick' and active;"),/\b0\b/,'Detener scheduler QA antes de fixtures.');
    const env={...await localEnv(),CARE_UX_AUDIT:'true',CARE_MOBILE_AUDIT:'true',PLAYWRIGHT_BROWSERS_PATH:path.join(root,'tmp','playwright-mobile')};
    const extended=action.startsWith('mobile-extended-');
    const startedAt=new Date().toISOString();
    if(action.endsWith('-audit'))for(const filename of extended?extendedMobileSuites:coreMobileSuites) {
        await run(process.execPath,['--experimental-strip-types',path.join(root,'scripts',filename)],{env});
      }
    const groups=extended?extendedMobileGroups:coreMobileGroups;
    const reports=await Promise.all(groups.map(async group=>JSON.parse(await readFile(path.join(output,'mobile',group+'.json'),'utf8'))));
    assert.ok(reports.every(report=>report.status==='PASS'));
    assert.ok(reports.every(report=>report.results.length>0&&!report.physicalDevices));
    if(action.endsWith('-audit'))assert.ok(reports.every(report=>report.at>=startedAt),'La consolidación contiene una matriz anterior a esta ejecución.');
    const results=reports.flatMap(r=>r.results.map(result=>({group:r.group,...result})));
    assert.ok(results.length>0);assert.equal(results.filter(r=>r.status!=='PASS').length,0);
    await writeFile(path.join(output,'mobile',extended?'extended-results.json':'results.json'),JSON.stringify({status:'PASS',at:new Date().toISOString(),groups:groups.length,physicalDevices:false,results},null,2));
    console.log(`PASS móvil: ${results.length} controles Chromium/WebKit; ${groups.length} contextos, fixtures retirados por sus suites. Instalación y teléfonos físicos pendientes.`);
  } else if(action==='ux-audit') {

    const env={...await localEnv(),CARE_UX_AUDIT:'true'};

    // Each fixture owner completes cleanup before the next suite starts.

    for(const filename of ['qa-care-e2e.mjs','qa-care-reports-e2e.mjs','qa-care-records-e2e.mjs','qa-care-dashboard-e2e.mjs','qa-care-recovery-family-e2e.mjs','qa-care-decisions-e2e.mjs','qa-care-informs-e2e.mjs','qa-care-jobs-e2e.mjs']) {

      await run(process.execPath,['--experimental-strip-types',path.join(root,'scripts',filename)],{env});

    }

    const groups=['planning-staff','planning-patient','technical','reports-staff','reports-patient','records-psychology','records-recovery','records-psychiatry','records-direction','records-patient','dashboard-direction','dashboard-empty','metrics-direction','metrics-empty','recovery-family-staff','recovery-family-direction','recovery-family-patient','recovery-family-empty','decisions-empty','decisions-direction','decisions-staff','informs-empty','informs-direction','informs-regenerated','informs-monthly','informs-professional','jobs-empty','jobs-configured','jobs-failed','jobs-completed','jobs-comparison','jobs-periods','jobs-team'];

    const reports=await Promise.all(groups.map(async group=>JSON.parse(await readFile(path.join(output,'ux',group+'.json'),'utf8'))));

    const results=reports.flatMap(r=>r.results.map(result=>({group:r.group,...result})));

    const failures=results.filter(r=>r.status==='FAIL');

    await writeFile(path.join(output,'ux','results.json'),JSON.stringify({status:failures.length?'FAIL':'PASS',at:new Date().toISOString(),groups:groups.length,screens:results.length,findings:failures.reduce((n,r)=>n+r.findings.length,0),results},null,2));

    assert.equal(failures.length,0,`Auditoría UX: ${failures.length} pantallas/recorridos requieren corrección. Ver tmp/care-qa/ux/results.json.`);

    console.log(`PASS UX: ${results.length} pantallas/recorridos, ${results.filter(r=>r.width===1440).length} rutas/estados, ${groups.length} contextos. Fixtures retirados por sus suites.`);

  } else if(action==='demo-refresh') {
    const filename='20261012230700_care_demo_data.sql';
    const input=await readFile(path.join(root,'supabase','migrations',filename),'utf8');
    const definitions=[...input.matchAll(/create function (?:private|public)\.demo_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function'));
    const recoveryFile='20261012235815_care_demo_cleanup_recovery.sql';
    if(existsSync(path.join(output,recoveryFile+'.json')))definitions.push(...[...(await readFile(path.join(root,'supabase','migrations',recoveryFile),'utf8')).matchAll(/create or replace function (?:private|public)\.demo_[\s\S]*?\$\$;/g)].map(m=>m[0]));
    assert.ok(definitions.length>=20);
    const grants=input.slice(input.indexOf('do $$declare f record;begin for f in select p.oid::regprocedure signature'));
    await sql("begin;alter table private.demo_batches add column if not exists staff_fingerprints jsonb not null default '{}';\n"+definitions.join('\n')+'\n'+grants);
    await writeFile(path.join(output,filename+'.json'),JSON.stringify({filename,hash:createHash('sha256').update(input).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));
    console.log('Funciones DEMO actualizadas solo en QA local.');
  } else if(action==='demo-data') {
    await run(process.execPath,['--experimental-strip-types',path.join(root,'scripts','qa-demo-data.ts')],{env:await localEnv()});
  } else if(action==='demo-recover') {
    await run(process.execPath,[path.join(root,'scripts','qa-demo-recover.mjs')],{env:await localEnv()});
  } else if(action==='demo-orphan') {
    await run(process.execPath,['--experimental-strip-types',path.join(root,'scripts','qa-demo-orphan.mjs')],{env:await localEnv()});
  } else if(action==='library-workspace-db') {
    const result=await sql(await readFile(path.join(root,'supabase','tests','care_library_upload_roles_test.sql'),'utf8'));
    assert.match(result,/ROLLBACK/);await writeFile(path.join(output,'library-upload-roles-db.log'),result);
    console.log('PASS: 10 upload role / privilege checks; synthetic transaction rolled back.');
  } else if(action==='library-workspace-cleanup') {
    await run(process.execPath,[path.join(root,'scripts','qa-library-workspace-cleanup.mjs'),process.argv[3]],{env:await localEnv()});
  } else if(action==='library-workspace-e2e') {
    await run(process.execPath,['--experimental-strip-types',path.join(root,'scripts','qa-library-workspace-e2e.mjs')],{env:await localEnv()});
  } else if(action==='director-e2e') {
    const env=await localEnv();
    await run(process.execPath,[path.join(root,'scripts','qa-care-director-e2e.mjs')],{env});
  } else if(['build','dev','preview','e2e','reports-e2e','records-e2e','dashboard-e2e','recovery-family-e2e','recovery-weekly-e2e','decisions-e2e','informs-e2e','jobs-e2e'].includes(action)) {

    const env=await localEnv();

    if(['e2e','reports-e2e','records-e2e','dashboard-e2e','recovery-family-e2e','recovery-weekly-e2e','decisions-e2e','informs-e2e','jobs-e2e'].includes(action)) await run(process.execPath,[...(['records-e2e','dashboard-e2e','recovery-family-e2e','recovery-weekly-e2e','decisions-e2e','informs-e2e','jobs-e2e'].includes(action)?['--experimental-strip-types']:[]),path.join(root,'scripts',action==='e2e'?'qa-care-e2e.mjs':action==='reports-e2e'?'qa-care-reports-e2e.mjs':action==='jobs-e2e'?'qa-care-jobs-e2e.mjs':action==='informs-e2e'?'qa-care-informs-e2e.mjs':action==='decisions-e2e'?'qa-care-decisions-e2e.mjs':action==='recovery-weekly-e2e'?'qa-care-recovery-weekly-e2e.mjs':action==='recovery-family-e2e'?'qa-care-recovery-family-e2e.mjs':action==='dashboard-e2e'?'qa-care-dashboard-e2e.mjs':'qa-care-records-e2e.mjs')],{env});

    else await run(process.execPath,[path.join(root,'node_modules','next','dist','bin','next'),...(action==='build'?['build']:action==='dev'?['dev','-p','3450']:['start','-p','3450'])],{env});

  } else console.log('care-local.mjs apply <migration> | db-test | build | dev | preview | e2e | reports-e2e | records-e2e | dashboard-e2e | recovery-family-e2e | recovery-weekly-e2e | decisions-e2e | informs-e2e | jobs-e2e | ux-audit | ux-report | mobile-audit | mobile-report | mobile-extended-audit | mobile-extended-report | release-db | release-web | scheduler-on [--qa-fast] | scheduler-off | scheduler-status. Solo QA local, claves ocultas. Ejecutar suites de fixtures de una en una.');

} catch(error) {console.error(error.message);process.exitCode=1;}

