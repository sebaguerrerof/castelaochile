import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const project='castelao-patient-qa';
assert.equal(JSON.parse(await readFile('tmp/patient-supabase-local/patient-qa.json','utf8')).project,project);
assert.match(await readFile('tmp/patient-supabase-local/supabase/config.toml','utf8'),/^project_id = "castelao-patient-qa"$/m);
const docker='C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const file='20261017160709_care_personal_autonomy.sql';
const migration=await readFile('supabase/migrations/'+file,'utf8');
const sql=process.argv.includes('--refresh-functions') ? "begin;\nalter table public.care_commitments alter column due_at drop not null;\nalter table public.care_commitment_history alter column due_at drop not null;\nalter table public.care_commitments add column if not exists source_personal_proposal_id uuid unique references private.care_pa_proposals(id);\nalter table private.care_pa_reviews add column if not exists actor_kind text not null check(actor_kind in ('patient','coach'));\nalter table private.care_pa_attestations add column if not exists agreement_snapshot jsonb not null;\n"+[...migration.matchAll(/create function (?:private|public)\.care_pa_[\s\S]*?\$\$;/g)].map(m=>m[0].replace('create function','create or replace function')).join('\n')+'\n'+[...migration.matchAll(/create index [\s\S]*?;/g)].map(m=>m[0].replace('create index','create index if not exists')).join('\n')+"\ndrop trigger if exists care_pa_protect_agreement on public.care_commitments;\ncreate trigger care_pa_protect_agreement before update on public.care_commitments for each row execute function private.care_pa_protect_agreement();\n"+"\ndo $$begin if exists(select 1 from private.care_pa_assessments) then raise exception 'Refresh del catálogo solo en QA vacío';end if;end $$;\nalter table private.care_pa_catalogs disable trigger care_pa_immutable;\n"+migration.match(/insert into private\.care_pa_catalogs\(id,document_version,definition\) values\([\s\S]*?\$catalog\$::jsonb\);/)[0].replace(/;$/,' on conflict(id) do update set definition=excluded.definition;')+'\nalter table private.care_pa_catalogs enable trigger care_pa_immutable;\n'+migration.slice(migration.lastIndexOf('revoke all on function')) : await readFile('supabase/tests/care_personal_autonomy_test.sql','utf8');
const output=await new Promise((resolve,reject)=>{const child=spawn(docker,['exec','-i','supabase_db_'+project,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-P','pager=off'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',reject);child.on('close',code=>code?reject(new Error(err)):resolve(out));child.stdin.end(sql);});
await mkdir('tmp/personal-autonomy-qa',{recursive:true});
if(process.argv.includes('--refresh-functions')){
  assert.match(output,/COMMIT/); console.log('PASS: funciones actualizadas únicamente en QA local.');
  await writeFile('tmp/care-qa/'+file+'.json',JSON.stringify({filename:file,hash:createHash('sha256').update(migration).digest('hex'),refreshedAt:new Date().toISOString(),environment:project},null,2));
} else {
  assert.match(output,/ROLLBACK/);const assertions=[...sql.matchAll(/^select pg_temp.pa_(assert|denied)\(/gm)].length;
  await writeFile('tmp/personal-autonomy-qa/db.json',JSON.stringify({status:'PASS',assertions,rollback:true,environment:project},null,2));
  console.log(`PASS: ${assertions} controles PostgreSQL reales; rollback completo.`);
}
