import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {personalAutonomyCatalog} from '../src/lib/care/personal-autonomy-catalog.ts';
assert.equal(JSON.parse(await readFile('tmp/patient-supabase-local/patient-qa.json','utf8')).project,'castelao-patient-qa');
const owner=JSON.parse(await readFile('tmp/personal-autonomy-qa/fixture-owner.json','utf8'));
assert.match(owner.runId,/^[a-f0-9]{8}$/);assert.equal(owner.users.length,4);
for(const id of owner.users)assert.match(id,/^[a-f0-9-]{36}$/);
const ids=owner.users.map(id=>`'${id}'`).join(',');
const sql=`select jsonb_build_object(
'users',(select count(*)from auth.users where id in(${ids})),
'profiles',(select count(*)from public.patient_profiles where auth_user_id in(${ids})),
'versions',(select count(*)from private.care_pa_versions where entered_by in(${ids})),
'proposals',(select count(*)from private.care_pa_proposals where proposed_by in(${ids})),
'reviews',(select count(*)from private.care_pa_reviews where actor_id in(${ids})),
'attestations',(select count(*)from private.care_pa_attestations where actor_id in(${ids})),
'observations',(select count(*)from private.care_pa_observations where actor_id in(${ids})),
'audit',(select count(*)from private.care_audit where actor_id in(${ids})),
'informs',(select count(*)from private.care_informs where created_by in(${ids})),
'immutable_triggers',(select count(*)from pg_trigger where tgname='care_pa_immutable' and tgenabled='O'),
'last_admin_protected',exists(select 1 from pg_trigger where tgname='protect_last_active_superadmin' and tgenabled='O'),
'rubric_pending',(select governance_state='proposal' and approved_by is null and not criteria_enabled from public.care_recovery_rubrics where id='c0000000-0000-4000-8000-000000000001'),
'catalog',(select definition from private.care_pa_catalogs where id='da000000-0000-4000-8000-000000000001'));
`;
const raw=await new Promise((resolve,reject)=>{const c=spawn('C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe',['exec','-i','supabase_db_castelao-patient-qa','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';c.stdout.on('data',d=>out+=d);c.stderr.on('data',d=>err+=d);c.on('error',reject);c.on('close',code=>code?reject(new Error(err)):resolve(out));c.stdin.end(sql);});
const result=JSON.parse(raw);
for(const key of ['users','profiles','versions','proposals','reviews','attestations','observations','audit','informs'])assert.equal(result[key],0,key);
assert.equal(result.immutable_triggers,5);assert.equal(result.last_admin_protected,true);assert.equal(result.rubric_pending,true);assert.deepEqual(result.catalog,personalAutonomyCatalog);
delete result.catalog;
await writeFile('tmp/personal-autonomy-qa/cleanup.json',JSON.stringify({status:'PASS',...result,catalog_exact:true},null,2));
console.log('PASS: limpieza independiente, protecciones restauradas, rúbrica pendiente y catálogo exacto en QA local.');
