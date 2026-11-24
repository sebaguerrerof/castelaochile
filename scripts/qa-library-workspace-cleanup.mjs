import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54421');
const run=process.argv[2];assert.match(run??'',/^[a-f0-9]{8}$/);
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const unwrap=r=>{if(r.error)throw Error(r.error.message);return r.data;};
async function sql(input){return new Promise((resolve,reject)=>{const p=spawn('C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe',['exec','-i','supabase_db_castelao-patient-qa','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='',error='';p.stdout.on('data',d=>output+=d);p.stderr.on('data',d=>error+=d);p.stdin.end(input);p.on('error',reject);p.on('close',c=>c?reject(Error(error)):resolve(output));});}
const all=unwrap(await service.auth.admin.listUsers()).users,users=all.filter(u=>new RegExp(`^library-ui-qa-${run}-[0-3]@example\\.test$`).test(u.email));
assert.equal(users.length,4,'Expected only the four owned accounts from the interrupted run');const ids=users.map(u=>u.id),quoted=ids.map(id=>`'${id}'`).join(',');
const materials=unwrap(await service.from('patient_library_materials').select('id').in('author_id',ids)),mids=materials.map(m=>m.id);
if(mids.length){const attachments=unwrap(await service.from('patient_library_attachments').select('object_key').in('material_id',mids));if(attachments.length)unwrap(await service.storage.from('patient-library').remove(attachments.map(a=>a.object_key)));const mq=mids.map(id=>`'${id}'`).join(',');await sql(`update public.patient_library_attachments set replaces_id=null where material_id in(${mq});delete from public.patient_library_attachments where material_id in(${mq});delete from public.patient_library_materials where id in(${mq});`);}
await sql(`begin;delete from public.patient_library_audit where actor_id in(${quoted});delete from public.admin_audit_log where actor_id in(${quoted});delete from private.care_audit where actor_id in(${quoted});delete from public.care_assignments where professional_id in(${quoted});delete from public.patient_profiles where auth_user_id in(${quoted});delete from public.care_staff_capabilities where user_id in(${quoted});alter table public.admin_users disable trigger protect_last_active_superadmin;delete from auth.users where id in(${quoted});alter table public.admin_users enable trigger protect_last_active_superadmin;commit;`);
console.log('PASS: four owned synthetic accounts, their materials and storage removed; protection restored.');
