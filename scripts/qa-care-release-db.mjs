import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

// Destructive recovery is confined to newly created databases in the marked QA
// cluster. The application database is only read; Storage writes use one owned key.
const project = 'castelao-patient-qa';
const container = `supabase_db_${project}`;
const docker = 'C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const output = 'tmp/care-qa/step-11';
const token = randomBytes(4).toString('hex');
const databases = [`care_release_${token}`, `care_restore_${token}`];
const created = [];
const checks = [], timings = [];
let failure, objectOwned = false;
assert.equal(JSON.parse(await readFile('tmp/patient-supabase-local/patient-qa.json', 'utf8')).project, project);
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin, 'http://127.0.0.1:54421');
assert.equal(process.env.PATIENT_AUTH_EMAILS_ENABLED, 'false');
assert.equal(process.env.ANALYTICS_ENABLED, 'false');
await mkdir(output, { recursive: true });
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const objectKey = `step11-restore-${token}/neutral.pdf`;
const temporary = `/tmp/castelao-step11-${token}`;
const uid = 'd1100000-0000-4000-8000-000000000003';
const patient = 'd1200000-0000-4000-8000-000000000001';
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function pass(label) { checks.push(label); console.log('PASS: ' + label); }
function check(result) { if (result.error) throw new Error(result.error.message); return result.data; }
async function command(args, input) {
  return new Promise((resolve, reject) => {
    const p = spawn(docker, args, { windowsHide: true, stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d);
    if (input) p.stdin.end(input);
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err || 'QA database command failed')));
  });
}
async function sql(db, input) {
  assert.ok(db === 'postgres' || created.includes(db));
  return command(['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-t', '-A'], input);
}
async function createDatabase(db) {
  assert.ok(databases.includes(db) && /^care_(release|restore)_[a-f0-9]{8}$/.test(db));
  await sql('postgres', `create database ${db} template template0;`);
  created.push(db);
  await sql(db, 'create schema extensions; create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions; create extension unaccent with schema extensions; create extension pg_stat_statements with schema extensions;');
}
async function authenticated(db, input, actor = uid) {
  assert.match(actor, /^[a-f0-9-]{36}$/);
  return sql(db, `begin;set local statement_timeout='30s';set local role authenticated;select set_config('request.jwt.claim.sub','${actor}',true);${input};commit;`);
}
async function manifest(db) {
  return JSON.parse(await sql(db, `select jsonb_build_object(
    'schemas',(select jsonb_agg(jsonb_build_object('schema',s,'role',r,'usage',has_schema_privilege(r,s,'USAGE'),'create',has_schema_privilege(r,s,'CREATE'))order by s,r)from unnest(array['public','private','auth','storage'])s cross join unnest(array['anon','authenticated','service_role'])r),
    'tables',(select jsonb_agg(x order by x.name) from(select n.nspname||'.'||c.relname name,c.relrowsecurity rls,coalesce(c.relacl,acldefault('r',c.relowner))::text acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private') and c.relkind='r' and c.relname like 'care_%')x),
    'columns',(select jsonb_agg(x order by x.name)from(select n.nspname||'.'||c.relname||'.'||a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull required,a.attidentity identity,a.attgenerated generated,pg_get_expr(d.adbin,d.adrelid) default_value from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname in('public','private')and c.relkind='r'and c.relname like 'care_%'and a.attnum>0 and not a.attisdropped)x),
    'constraints',(select jsonb_agg(x order by x.name)from(select n.nspname||'.'||c.relname||'.'||k.conname name,pg_get_constraintdef(k.oid,true) definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private')and c.relname like 'care_%')x),
    'indexes',(select jsonb_agg(x order by x.name)from(select schemaname||'.'||tablename||'.'||indexname name,indexdef definition from pg_indexes where schemaname in('public','private')and tablename like 'care_%')x),
    'functions',(select jsonb_agg(x order by x.name) from(select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' name,md5(p.prosrc) body,p.prosecdef definer,p.proconfig config,coalesce(p.proacl,acldefault('f',p.proowner))::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.proname like 'care_%')x),
    'policies',(select jsonb_agg(x order by x.name) from(select schemaname||'.'||tablename||'.'||policyname name,permissive,roles::text,cmd,qual,with_check from pg_policies where tablename like 'care_%' or policyname like 'care_%')x)
  );`));
}
try {
  assert.equal(await sql('postgres', "select count(*)from cron.job where jobname='castelao-care-tick'and active;"), '0');
  await writeFile(`${output}/owned.json`, JSON.stringify({ project, databases, objectKey, at: new Date().toISOString() }, null, 2));
  await createDatabase(databases[0]);
  // Infrastructure only, without application Storage policies from later steps.
  await command(['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '-Fc', '--schema=auth', '--schema=storage', `--file=${temporary}-infra.dump`]);
  const list = await command(['exec', container, 'pg_restore', '--list', `${temporary}-infra.dump`]);
  const filtered = list.split('\n').filter(line => !/\b(POLICY|TABLE DATA|SEQUENCE SET|DEFAULT ACL)\b/.test(line)).join('\n');
  await command(['exec', '-i', container, 'tee', `${temporary}-infra.list`], filtered);
  await command(['exec', container, 'pg_restore', '-U', 'postgres', '-d', databases[0], '--no-owner', '--exit-on-error', '--use-list', `${temporary}-infra.list`, `${temporary}-infra.dump`]);
  const files = (await readdir('supabase/migrations')).filter(f => /^\d{14}_.+\.sql$/.test(f)).sort();
  const excluded = [];
  for (const file of files) {
    let input = await readFile(`supabase/migrations/${file}`, 'utf8');
    if (file === '20261005140314_visitor_analytics.sql') {
      // pg_cron can be installed only in cron.database_name (postgres). This
      // isolated DB has no native worker; preserve the real cluster configuration.
      const marker = 'create extension if not exists pg_cron;';
      const boundary = input.indexOf(marker);
      assert.ok(boundary > 0 && input.slice(boundary).includes("cron.schedule('castelao-analytics-retention'"));
      excluded.push({ file, scope: 'native analytics cron registration only; SQL schema/functions unchanged', sha256: digest(input.slice(boundary)) });
      input = input.slice(0, boundary);
    }
    await sql(databases[0], input);
  }
  pass(`${files.length} application migrations applied in order to an empty isolated database; host-specific analytics cron registration excluded explicitly`);
  assert.deepEqual(await manifest(databases[0]), await manifest('postgres'));
  pass('Fresh care tables, RLS, policy expressions, function bodies and grants match the existing QA database');
  let assertions = 0;
  for (const name of (await readdir('supabase/tests')).filter(n => /^(care_.*|patient_library_rls)_test\.sql$/.test(n)).sort()) {
    const input = await readFile(`supabase/tests/${name}`, 'utf8');
    assert.match(await sql(databases[0], input), /ROLLBACK/);
    assertions += [...input.matchAll(/^select pg_temp\.(care|library)_(assert|denied)\(/gm)].length;
  }
  assert.ok(assertions >= 1006, "Fresh schema must execute all current SQL suites");
  pass(`${assertions} SQL/RLS assertions pass on fresh migrations with rollback; no refresh shortcuts`);
  await sql(databases[0], `
    insert into auth.users(id,email)select ('d1100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'release-scratch-'||n||'@example.test'from generate_series(1,4)n;
    insert into public.admin_users(user_id,role,is_active)values('${uid}','viewer',true),('d1100000-0000-4000-8000-000000000004','editor',true);
    insert into public.care_staff_capabilities(user_id,capabilities)values('${uid}',array['care.directory.read','care.patient.read','care.records.read','care.records.create','care.reports.export','care.alerts.review']);
    insert into public.patient_profiles(id,auth_user_id,email,display_name)select ('d1200000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('d1100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'release-scratch-'||n||'@example.test','Persona neutral recuperación '||n from generate_series(1,2)n;
    insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by)values('${patient}','${uid}','direction',now()-interval '2 years','${uid}');
    insert into public.care_events(id,title,kind,starts_at,ends_at,professional_id,modality,status,closed_at,created_by)values('d1300000-0000-4000-8000-000000000001','Sesión neutral recuperación','individual',(date_trunc('week',now()at time zone 'America/Santiago')-interval '6 days')at time zone 'America/Santiago',(date_trunc('week',now()at time zone 'America/Santiago')-interval '6 days'+interval '1 hour')at time zone 'America/Santiago','${uid}','in_person','completed',now()-interval '1 day','${uid}');
    insert into public.care_event_participants(event_id,patient_id,attendance,recorded_at,observed_by)values('d1300000-0000-4000-8000-000000000001','${patient}','present',now(),'${uid}');
    insert into public.care_session_records(id,patient_id,event_id,author_id,specialty,occurred_at,status,revision,first_finalized_at)select 'd1400000-0000-4000-8000-000000000001','${patient}',id,'${uid}','psychology',starts_at,'final',2,now()-interval '1 hour'from public.care_events;
    insert into private.care_record_versions(id,record_id,revision,occurred_at,payload,reason,actor_id)select ('d1500000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'d1400000-0000-4000-8000-000000000001',n,now()-interval '6 days',jsonb_build_object('objective','Objetivo neutral versión '||n,'evolution','not_evaluable'),'Versión neutral recuperación','${uid}'from generate_series(1,2)n;
    insert into private.care_record_reserves(version_id,body)select id,'RESERVA NEUTRAL DE RECUPERACIÓN '||revision from private.care_record_versions;
  `);
  await authenticated(databases[0], "select public.care_inform_write('generate',jsonb_build_object('kind','weekly','patient_id','" + patient + "','reason','Consolidado neutral recuperación'))");
  const rid = await sql(databases[0], 'select id from private.care_informs;');
  await authenticated(databases[0], `select public.care_inform_write('regenerate',jsonb_build_object('id','${rid}','version',1,'reason','Segunda versión neutral recuperación'))`);
  const pdf = await readFile('tmp/care-qa/step-10-scheduled.pdf');
  const pdfHash = digest(pdf);
  check(await service.storage.from('care-informs').upload(objectKey, pdf, { contentType: 'application/pdf', upsert: false }));
  objectOwned = true;
  const object = JSON.parse(await sql('postgres', `select jsonb_build_object('id',id,'metadata',metadata)from storage.objects where bucket_id='care-informs'and name='${objectKey}';`));
  await sql(databases[0], `insert into storage.objects(id,bucket_id,name,metadata)values('${object.id}','care-informs','${objectKey}','${JSON.stringify(object.metadata).replaceAll("'", "''")}'::jsonb);
    insert into private.care_inform_exports(inform_id,revision,actor_id,object_key,state,bytes,sha256,finished_at)values('${rid}',1,'${uid}','${objectKey}','ready',${pdf.length},'${pdfHash}',now());`);
  const snapshots = await sql(databases[0], 'select md5(string_agg(snapshot::text,\'\'order by revision))from private.care_inform_versions;');
  const reservedHash = await sql(databases[0], "select md5(string_agg(version_id::text||body,''order by version_id))from private.care_record_reserves;");
  const versionsHash = await sql(databases[0], "select md5(string_agg(to_jsonb(v)::text,''order by id))from private.care_record_versions v;");
  const before = await manifest(databases[0]);
  const backupStart = performance.now();
  await command(['exec', container, 'pg_dump', '-U', 'postgres', '-d', databases[0], '-Fc', '--schema=auth', '--schema=storage', '--schema=public', '--schema=private', `--file=${temporary}-application.dump`]);
  await command(['cp', `${container}:${temporary}-application.dump`, `${output}/application.dump`]);
  const objectBackup = Buffer.from(await check(await service.storage.from('care-informs').download(objectKey)).arrayBuffer());
  assert.equal(digest(objectBackup), pdfHash);
  await writeFile(`${output}/storage-neutral.pdf`, objectBackup);
  pass('Consistent stopped-writer application backup plus a separate private Storage object copied and hashed');
  await createDatabase(databases[1]);
  await sql(databases[1], 'drop schema public;');
  await command(['exec', container, 'pg_restore', '-U', 'postgres', '-d', databases[1], '--no-owner', '--exit-on-error', '--single-transaction', `${temporary}-application.dump`]);
  // pg_dump omits default public schema privileges; recreating that schema with
  // --no-owner changes its default. Restore the captured application role rights.
  for (const p of before.schemas) {
    assert.ok(['public','private','auth','storage'].includes(p.schema));
    assert.ok(['anon','authenticated','service_role'].includes(p.role));
    await sql(databases[1], `${p.usage?'grant':'revoke'} usage on schema ${p.schema} ${p.usage?'to':'from'} ${p.role};${p.create?'grant':'revoke'} create on schema ${p.schema} ${p.create?'to':'from'} ${p.role};`);
  }
  timings.push({ operation: 'backup_and_restore_ms', value: Math.round(performance.now() - backupStart) });
  assert.deepEqual(await manifest(databases[1]), before);
  assert.equal(await sql(databases[1], 'select md5(string_agg(snapshot::text,\'\'order by revision))from private.care_inform_versions;'), snapshots);
  assert.equal(await sql(databases[1], 'select count(*)from private.care_record_reserves;'), '2');
  assert.equal(await sql(databases[1], "select md5(string_agg(version_id::text||body,''order by version_id))from private.care_record_reserves;"), reservedHash);
  assert.equal(await sql(databases[1], "select md5(string_agg(to_jsonb(v)::text,''order by id))from private.care_record_versions v;"), versionsHash);
  pass('Restore preserves all care schema, grants/RLS, two immutable report snapshots and two reserved versions');
  // Loss and recovery affect only our own synthetic object, never prior exports.
  check(await service.storage.from('care-informs').remove([objectKey]));
  assert.ok((await service.storage.from('care-informs').download(objectKey)).error);
  check(await service.storage.from('care-informs').upload(objectKey, await readFile(`${output}/storage-neutral.pdf`), { contentType: 'application/pdf', upsert: false }));
  const restoredBytes = Buffer.from(await check(await service.storage.from('care-informs').download(objectKey)).arrayBuffer());
  const exported = JSON.parse(await sql(databases[1], `select jsonb_build_object('bytes',bytes,'sha256',sha256,'key',object_key)from private.care_inform_exports;`));
  assert.equal(restoredBytes.length, exported.bytes); assert.equal(digest(restoredBytes), exported.sha256); assert.equal(exported.key, objectKey);
  pass('Owned Storage loss is recovered from separate bytes; restored export key/size/SHA256 match');
  const restoredRead = await authenticated(databases[1], `select public.care_inform_read('${rid}',1,1,false)`);
  assert.match(restoredRead, /Persona neutral recuperación 1/); assert.doesNotMatch(restoredRead, /RESERVA NEUTRAL/);
  pass('Restored authenticated direction can read original report but receives no reserved body');
  for (const actor of ['d1100000-0000-4000-8000-000000000001', 'd1100000-0000-4000-8000-000000000002', 'd1100000-0000-4000-8000-000000000004']) {
    await assert.rejects(authenticated(databases[1], `select public.care_inform_read('${rid}',1,1,false)`, actor), /Recurso no disponible/);
  }
  pass('Restored patient A, patient B and CMS normal SQL identities are denied internal reports');
  await assert.rejects(authenticated(databases[1], 'select body from private.care_record_reserves'), /permission denied/);
  pass('Restored direct reserved table access remains denied to authenticated role');
  let recoveryRestoredAssertions=0;
  for(const name of ['care_recovery_activity_test.sql','care_recovery_weekly_test.sql','care_recovery_monthly_test.sql','care_recovery_coordination_test.sql']){
    const input=await readFile(`supabase/tests/${name}`,'utf8');assert.match(await sql(databases[1],input),/ROLLBACK/);
    recoveryRestoredAssertions+=[...input.matchAll(/^select pg_temp\.care_(assert|denied)\(/gm)].length;
  }
  assert.equal(recoveryRestoredAssertions,136);
  pass(`${recoveryRestoredAssertions} Recovery activity/weekly/monthly/communication/rule assertions also pass on the restored schema with rollback`);

  const revoke = `begin;update public.care_assignments set ends_at=now()where patient_id='${patient}';set local role authenticated;select set_config('request.jwt.claim.sub','${uid}',true);select public.care_inform_read('${rid}',1,1,false);rollback;`;
  await assert.rejects(sql(databases[1], revoke), /Recurso no disponible/);
  assert.equal(await sql(databases[1], "select count(*)from public.care_assignments where ends_at is null;"), '1');
  pass('Restored assignment revocation denies previous identity; failed test transaction rolls back');
  assert.equal(await sql(databases[1], "select to_regclass('cron.job')is null;"), 't');
  pass('Recovery does not create/activate a cron job or copy scheduler execution claims');
  // Synthetic volume is isolated from the application and the recovery specimen.
  await sql(databases[0], `
    insert into auth.users(id,email)select ('d2100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'volume-scratch-'||n||'@example.test'from generate_series(1,501)n;
    insert into public.admin_users(user_id,role,is_active)values('d2100000-0000-4000-8000-000000000501','viewer',true);
    insert into public.care_staff_capabilities(user_id,capabilities)values('d2100000-0000-4000-8000-000000000501',array['care.directory.read','care.patient.read','care.records.read','care.reports.export','care.alerts.review']);
    insert into public.patient_profiles(id,auth_user_id,email,display_name)select ('d2200000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('d2100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'volume-scratch-'||n||'@example.test','Persona neutral volumen '||n from generate_series(1,500)n;
    insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by)select id,'${uid}','psychology',now()-interval '2 years','${uid}'from public.patient_profiles where id::text like 'd2200000-%';
    insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by)select id,'d2100000-0000-4000-8000-000000000501','direction',now()-interval '2 years','${uid}'from public.patient_profiles where id::text like 'd2200000-%'order by id limit 50;
    insert into public.care_events(id,title,kind,starts_at,ends_at,professional_id,modality,status,closed_at,created_by)select ('d2300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Sesión neutral volumen '||n,'individual',(date_trunc('week',now()at time zone 'America/Santiago')-interval '6 days'+interval '9 hours')at time zone 'America/Santiago',(date_trunc('week',now()at time zone 'America/Santiago')-interval '6 days'+interval '10 hours')at time zone 'America/Santiago','${uid}','in_person','completed',now()-interval '1 day','${uid}'from generate_series(1,10000)n;
    insert into public.care_event_participants(event_id,patient_id,attendance,recorded_at,observed_by)select ('d2300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('d2200000-0000-4000-8000-'||lpad(((n-1)/20+1)::text,12,'0'))::uuid,case when n%4=0 then 'absent'else 'present'end,now(),'${uid}' from generate_series(1,10000)n;
    analyze public.care_assignments;analyze public.patient_profiles;analyze public.care_events;analyze public.care_event_participants;
  `);
  pass('Isolated volume fixture: 500 additional patients, 10000 events/participants, predictable 7500 present/2500 absent');
  const operations = [
    ['metrics', "select public.care_metrics('{\"period\":\"30\"}')"],
    ['dashboard', 'select public.care_dashboard(30)'],
    ['sources', "select public.care_metric_sources('{\"period\":\"30\"}','attendance','present',1,now())"]
  ];
  for (const [operation, statement] of operations) {
    const samples = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      const raw = await authenticated(databases[0], statement);
      const result = JSON.parse(raw.split('\n').find(line => line.startsWith('{')));
      if (i === 0) await writeFile(`${output}/volume-${operation}.json`, JSON.stringify(result, null, 2));
      if (operation === 'metrics') {
        assert.equal(result.population, 501);
        assert.equal(result.counts.find(c => c.metric === 'attendance' && c.category === 'present').n, 7501);
      } else if (operation === 'dashboard') { assert.equal(result.attendance.present, 7501); assert.equal(result.attendance.absent, 2500); }
      else { assert.equal(result.total, 7501); assert.ok(result.rows.length <= 50); }
      samples.push(Math.round(performance.now() - start));
    }
    samples.sort((a, b) => a - b);
    timings.push({ operation, samples_ms: samples, median_ms: samples[2], p95_ms: samples[4], includes: 'Docker process + authenticated SQL + JSON transfer; single sequential client, not production SLA' });
    const plan = await authenticated(databases[0], `explain(analyze,buffers,format json) ${statement}`);
    await writeFile(`${output}/plan-${operation}.txt`, plan);
    pass(`Volume ${operation}: five measured calls preserve exact counts/pagination; EXPLAIN ANALYZE recorded`);
  }
  await assert.rejects(authenticated(databases[0], "select public.care_inform_write('generate','{\"kind\":\"weekly\",\"reason\":\"Alcance neutral volumen\"}')"), /superior a 50/);
  pass('Oversized report cohort fails explicitly without truncating patients');
  await assert.rejects(authenticated(databases[0], "select public.care_inform_write('generate','{\"kind\":\"weekly\",\"reason\":\"Fuentes neutral volumen\"}')", 'd2100000-0000-4000-8000-000000000501'), /fuentes|1000/i);
  assert.equal(await sql(databases[0], 'select count(*)from private.care_informs;'), '1');
  pass('Over 1000 sources per period fails without partial report, original report preserved');
  await writeFile(`${output}/migration-manifest.json`, JSON.stringify({ files, excluded, care: before }, null, 2));
} catch (error) { failure = error; }
finally {
  try {
    if (objectOwned) check(await service.storage.from('care-informs').remove([objectKey]));
    assert.equal(await sql('postgres', `select count(*)from storage.objects where bucket_id='care-informs'and name='${objectKey}';`), '0');
    for (const db of created.slice().reverse()) {
      assert.ok(databases.includes(db) && /^care_(release|restore)_[a-f0-9]{8}$/.test(db));
      assert.notEqual(db, 'postgres');
      await sql('postgres', `drop database ${db};`);
    }
    assert.equal(await sql('postgres', `select count(*)from pg_database where datname in('${databases[0]}','${databases[1]}');`), '0');
    pass('Only owned disposable databases and Storage object removed; application database preserved');
  } catch (error) { failure ??= error; }
  await writeFile(`${output}/db-release-results.json`, JSON.stringify({ status: failure ? 'FAIL' : 'PASS', at: new Date().toISOString(), environment: 'marked-local-only', checks, count: checks.length, timings, source_database_restored: false, scheduler_activated: false, ...failure ? { error: failure.message } : { cleanup: 'complete' } }, null, 2));
}
if (failure) { console.error(failure.message.slice(0, 1500)); process.exitCode = 1; }
