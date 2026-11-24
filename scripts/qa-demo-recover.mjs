import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54421');
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
async function sql(input){return new Promise((resolve,reject)=>{const p=spawn('C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe',['exec','-i','supabase_db_castelao-patient-qa','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-t','-A'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.stdin.end(input);p.on('error',reject);p.on('close',code=>code?reject(Error(err)):resolve(out.trim()));});}
const owners=JSON.parse(await sql("select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email)),'[]')from auth.users u where email~'^demo-owner-qa-[a-f0-9]+@example.test$';"));
for(const owner of owners){
 assert.match(owner.id,/^[a-f0-9-]{36}$/);assert.match(owner.email,/^demo-owner-qa-[a-f0-9]+@example.test$/);
 const batches=JSON.parse(await sql(`select coalesce(jsonb_agg(id),'[]')from private.demo_batches where created_by='${owner.id}';`));
 for(const bid of batches){
  const lines=(await sql(`begin;select set_config('request.jwt.claim.sub','${owner.id}',true);select private.demo_remove_data('${bid}');commit;`)).split('\n');
  const receipt=JSON.parse(lines.find(line=>line.startsWith('{')));const users=[];
  for(const a of receipt.accounts){const{data,error}=await service.auth.admin.getUserById(a.id);if(error&&error.status!==404)throw error;if(data.user){assert.equal(data.user.app_metadata.castelao_demo_batch,bid);assert.equal(data.user.email,a.email);users.push(a.id);}}
  for(const bucket of['patient-library','care-informs']){const keys=receipt.files.filter(f=>f.bucket===bucket).map(f=>f.key);if(keys.length){const{error}=await service.storage.from(bucket).remove(keys);if(error)throw error;}}
  for(const id of users){const{error}=await service.auth.admin.deleteUser(id);if(error)throw error;}
  if(receipt.state!=='removed')await sql(`begin;select set_config('request.jwt.claim.sub','${owner.id}',true);select private.demo_finish_removal('${bid}');commit;`);
  await sql(`begin;delete from private.demo_accounts where batch_id='${bid}';delete from private.demo_baseline where batch_id='${bid}';delete from private.demo_objects where batch_id='${bid}';delete from private.demo_batches where id='${bid}'and state='removed';commit;`);
 }
 await sql(`begin;delete from public.admin_audit_log where actor_id='${owner.id}';delete from private.care_audit where actor_id='${owner.id}';delete from public.care_staff_capabilities where user_id='${owner.id}';alter table public.admin_users disable trigger protect_last_active_superadmin;delete from auth.users where id='${owner.id}';alter table public.admin_users enable trigger protect_last_active_superadmin;commit;`);
}
console.log(`PASS: ${owners.length} owned QA demo owners recovered; no production access.`);
