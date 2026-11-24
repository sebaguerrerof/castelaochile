import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'https://rybcqiuklmoxhcostmlf.supabase.co');
const proof=JSON.parse(await readFile('tmp/care-production/demo-postflight.json','utf8')).rows[0].postflight;
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const anonymous=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
const checks=[];function pass(label){checks.push(label);}
assert.ok((await anonymous.rpc('demo_status')).error);pass('DEMO registry unavailable anonymously');
for(const [table,column]of[['content_posts','author_id'],['professionals','updated_by'],['cms_pages','updated_by']]){
 const{data,error}=await anonymous.from(table).select('id').like('slug','demo-'+proof.batch.id.slice(0,8)+'%');assert.equal(error,null);assert.equal(data.length,0);pass(table+' drafts hidden from anonymous readers');
}
const files=await service.from('patient_library_attachments').select('id,object_key').eq('material_id',proof.batch.summary.material_id).eq('state','ready');assert.equal(files.error,null);assert.equal(files.data.length,1);
const file=files.data[0];assert.ok((await anonymous.storage.from('patient-library').download(file.object_key)).error);pass('DEMO PDF bucket is private');
const r=await fetch('https://www.castelaochile.cl/api/pacientes/archivos/'+file.id);assert.ok([401,403,404].includes(r.status));pass('DEMO PDF application route denies anonymous reads');
const groupMaterials=await anonymous.from('patient_library_materials').select('id').eq('id',proof.batch.summary.material_id);assert.equal(groupMaterials.data?.length??0,0);pass('group material invisible without an authorized patient/staff session');
await writeFile('tmp/care-production/demo-privacy.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),checks},null,2));console.log(`PASS ${checks.length} private DEMO checks`);
