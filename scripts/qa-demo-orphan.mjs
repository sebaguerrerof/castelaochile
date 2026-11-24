import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {removeDemo} from '../src/lib/demo/service.ts';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54421');
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}}),client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
const check=r=>{if(r.error)throw Error(r.error.message);return r.data;};
async function sql(input){return new Promise((resolve,reject)=>{const p=spawn('C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe',['exec','-i','supabase_db_castelao-patient-qa','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-t','-A'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.stdin.end(input);p.on('error',reject);p.on('close',code=>code?reject(Error(err)):resolve(out.trim()));});}
const password=randomBytes(32).toString('base64url');const owner=check(await service.auth.admin.createUser({email:'demo-owner-qa-'+randomBytes(5).toString('hex')+'@example.test',password,email_confirm:true})).user;
let bid;
try{
 await sql(`insert into public.admin_users(user_id,role,is_active)values('${owner.id}','superadmin',true);`);check(await client.auth.signInWithPassword({email:owner.email,password}));
 bid=check(await service.rpc('demo_begin',{actor:owner.id}));
 const orphan=check(await service.auth.admin.createUser({email:`demo-${bid}-patient_a@example.invalid`,password,email_confirm:true,ban_duration:'876000h',app_metadata:{castelao_demo_batch:bid}})).user;
 assert.equal(JSON.parse(await sql(`select count(*)from private.demo_accounts where batch_id='${bid}';`)),0);
 await removeDemo(client,service,bid);assert.equal((await service.auth.admin.getUserById(orphan.id)).data.user,null);
 assert.equal(await sql(`select state from private.demo_batches where id='${bid}';select tgenabled from pg_trigger where tgname='protect_last_active_superadmin';`),'removed\nO');
 await writeFile('tmp/care-qa/demo/orphan-results.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),scenario:'createUser succeeded; registration interrupted; cleanup recovers and deletes only the new marked identity',cleanup:'complete'},null,2));console.log('PASS orphan identity recovery without seed or trigger changes');
}catch(error){console.error('QA interruption failure:',error.message);throw error;}finally{
 if(bid&&(await sql(`select state<>'removed'from private.demo_batches where id='${bid}';`))==='t')await removeDemo(client,service,bid);
 await sql(`begin;delete from private.demo_accounts where batch_id in(select id from private.demo_batches where created_by='${owner.id}');delete from private.demo_batches where created_by='${owner.id}'and state='removed';delete from public.admin_audit_log where actor_id='${owner.id}';delete from public.care_staff_capabilities where user_id='${owner.id}';alter table public.admin_users disable trigger protect_last_active_superadmin;delete from auth.users where id='${owner.id}';alter table public.admin_users enable trigger protect_last_active_superadmin;commit;`);
}
