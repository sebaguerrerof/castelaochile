import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const backup=process.argv[2];if(!backup)throw new Error('Indica el respaldo posterior a la migración.');
const snapshot=JSON.parse(await readFile(backup,'utf8'));
const options={auth:{persistSession:false,autoRefreshToken:false}};
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
assert.equal(snapshot.origin,new URL(url).origin);
for(const name of ['cms_pages','cms_page_sections','professionals','site_settings']){
 const {data,error}=await admin.from(name).select('*');assert.ifError(error);
 for(const original of snapshot.tables[name]){
  const current=data.find(row=>row.id===original.id);assert(current,`Se eliminó ${name}/${original.id}`);
  assert.deepEqual(current,original,`Se cambió la versión pública o preexistente de ${name}/${original.id}`);
 }
}
const drafts=await admin.from('cms_editorial_drafts').select('kind,resource_id,data');assert.ifError(drafts.error);
const pages=drafts.data.filter(row=>row.kind==='page'&&row.data.status!=='archived');assert.equal(pages.length,11);
const proposedRetirements=drafts.data.filter(row=>row.kind==='page'&&row.data.status==='archived');
assert.equal(drafts.data.filter(row=>row.kind==='professional').length,4);
assert.equal(drafts.data.filter(row=>row.kind==='settings').length,1);
const denied=await anon.from('cms_editorial_drafts').select('*');assert(denied.error,'Los borradores no deben ser accesibles anónimamente');
const publicPages=await anon.from('cms_pages').select('path');assert.ifError(publicPages.error);assert.equal(publicPages.data.length,9);
for(const path of ['/tratamientos','/tratamientos/individual','/recovery-90'])assert(!publicPages.data.some(page=>page.path===path));
const publicPeople=await anon.from('professionals').select('slug');assert.ifError(publicPeople.error);assert.equal(publicPeople.data.length,1);
const result={publishedDataUnchanged:true,privatePages:pages.length,privateBlocks:pages.reduce((n,p)=>n+p.data.sections.length,0),proposedRetirements:proposedRetirements.length,privateProfessionals:4,privateSettings:1,anonymousDraftAccessDenied:true,publicPages:publicPages.data.length,publicProfessionals:publicPeople.data.length};
await writeFile('tmp/client-content-2026-11-06/verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
