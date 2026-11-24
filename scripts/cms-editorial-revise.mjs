import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile} from 'node:fs/promises';
import {pageEditSchema,professionalSchema,settingsSchema} from '../src/lib/cms/schemas.ts';
import {sanitizeBlogHtml} from '../src/lib/blog/content.ts';
const file=process.argv[2];if(!file)throw new Error('Indica el archivo de revisiones. Sin --apply solo se valida.');
const proposals=JSON.parse(await readFile(file,'utf8'));
const validated=proposals.map(p=>{
 const schema=p.kind==='page'?pageEditSchema:p.kind==='professional'?professionalSchema:p.kind==='settings'?settingsSchema:null;
 if(!schema)throw new Error('Tipo editorial inválido.');
 const data=schema.parse(p.data);
 if(p.kind==='page')for(const section of data.sections)if(typeof section.data.html==='string')section.data.html=sanitizeBlogHtml(section.data.html);
 if(p.kind==='professional')for(const field of ['bio','professional_experience','recovery_experience'])data[field]=sanitizeBlogHtml(data[field]);
 return {...p,data};
});
if(!process.argv.includes('--apply')){console.log(JSON.stringify({validated:validated.length,changedDatabase:false}));process.exit(0);}
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,options);
const session=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
function db(result){if(result.error)throw new Error(`CMS ${result.error.code}: ${result.error.message}`);return result.data;}
const staff=db(await service.from('admin_users').select('user_id').eq('role','superadmin').eq('is_active',true).order('created_at').limit(1));
const owner=db(await service.auth.admin.getUserById(staff[0].user_id)).user;
const link=db(await service.auth.admin.generateLink({type:'magiclink',email:owner.email}));
const result=[];
try{
 db(await session.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token}));
 for(const p of validated){
  db(await session.rpc('save_editorial_content',{p_kind:p.kind,p_id:p.id,p_data:p.data,p_base_updated_at:p.baseVersion,p_draft_updated_at:p.draftVersion??null,p_publish:false}));
  result.push({kind:p.kind,id:p.id});
 }
 await writeFile('tmp/client-content-2026-11-06/readability-revisions-result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({savedDrafts:result.length,published:false}));
}finally{await session.auth.signOut({scope:'local'});}
